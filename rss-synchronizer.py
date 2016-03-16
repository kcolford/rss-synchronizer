#!/usr/bin/env python3

"""Synchronize RSS feeds and send emails.

Configuration data is stored in local MySQL database.

"""

import os
import getpass
import smtplib
import logging
import datetime
from datetime import datetime
import time
import email.utils
import email.mime.text
import pycurl
import pymysql
import lxml.etree

class DBHandler(logging.Handler):
  def emit(self, record):
    with connection as cursor:
      cursor.execute("""INSERT INTO log (message) VALUE (%s)""",
                     self.format(record))

dbhandler = DBHandler()
dbhandler.setFormatter(logging.Formatter())

def update_config():
  """Update the local configuration."""

  global config, logger, connection

  # establish the connection and update the config
  connection = pymysql.connect(host=config['com.kcolford.rss.db.host'],
                               user=config['com.kcolford.rss.db.user'],
                               db=config['com.kcolford.rss.db.schm'],
                               passwd=config['com.kcolford.rss.db.pass'])
  config = {}
  with connection as cursor:
    cursor.execute("""SELECT name, value FROM config""")
    for name, value in cursor:
      config[name] = value
  logging.basicConfig()
  logger = logging.getLogger(config['com.kcolford.rss.log.name'])
  logger.setLevel(getattr(logging, config['com.kcolford.rss.log.level']))
  logger.removeHandler(dbhandler)
  if config['com.kcolford.rss.log.usedb'] == 'true':
    logger.addHandler(dbhandler)
  lxml.etree.use_global_python_log(
    lxml.etree.PyErrorLog(logger.getChild('xmlparser')))

def has_category(it, category):
  """Return True iff `it` has category `category`."""

  return category in [None] + [c.text for c in it.findall('category')]

def parse_rfc822(s):
  """Return a datetime object for RFC822 formatted `s`."""

  return datetime.fromtimestamp(
    email.utils.mktime_tz(email.utils.parsedate_tz(s)))

def fetch_url(url):
  """Return the content found at url."""

  # build a standard curl object
  c = pycurl.Curl()
  c.setopt(pycurl.ENCODING, '')
  c.setopt(pycurl.USERAGENT, config['com.kcolford.rss.curl.user-agent'])
  c.setopt(pycurl.FOLLOWLOCATION, True)
  c.setopt(pycurl.FAILONERROR, True)
  c.setopt(pycurl.VERBOSE, False)
  c.setopt(pycurl.NOPROGRESS, True)

  # pass interesting parameters to it
  data = []
  c.setopt(pycurl.WRITEFUNCTION, data.append)
  c.setopt(pycurl.URL, url)
  c.perform()

  status = c.getinfo(pycurl.HTTP_CODE)
  logger.debug('%s returned status code %s', url, status)
  if status != 200:
    logger.error('%s', c.errstr())
    logger.error('URL %s returned status code %s', url, status)
    raise Exception('Failed to fetch reasource')

  return ''.join(s.decode() for s in data).encode()
  
def make_message(channel, item):
  """Return an email message out of the item in channel."""

  def fmt(template, arg):
    arga = item.find(arg).text
    logger.debug('source %s has %s value %s', channel.find('title').text,
              arg, arga)
    return (template % arga) if arga else ''

  msg = email.mime.text.MIMEText(
    (
      """<!DOCTYPE html>
      <html>
      <head></head>
      <body>
      """ + fmt('<p>%s</p>', 'description') + """
      """ + fmt('<p><a href="%s">Click for more</a></p>', 'link') + """
      </body>
      </html>
      """
    )
    , 'html', 'utf-8')
  msg['Subject'] = '[%s] %s' % (channel.find('title').text,
                                item.find('title').text)
  logger.debug('constructed message with subject %s', msg['Subject'])
  return msg

def aggregate():
  """Aggregate all configured feeds and send out updates."""

  update_config()

  # connect to smtp server
  smtp = smtplib.SMTP(config['com.kcolford.rss.smtp.host'])
  smtp.starttls()
  smtp.login(config['com.kcolford.rss.smtp.user'],
             config['com.kcolford.rss.smtp.pass'])

  # determine what sources have been updated
  updated_sources = {}
  with connection as cursor:
    cursor.execute("""
    SELECT source_id, url, category
    FROM view_sources""")
    for source_id, url, category in cursor:
      # fetch last update time of source
      with connection as cursor:
        cursor.execute("""
        SELECT time
        FROM src_time
        WHERE source_id = %s""", [source_id])
        try:
          last_update_time = datetime.fromtimestamp(next(iter(cursor))[0])
        except StopIteration:
          logger.info('source %s is new and never used before', url)
          last_update_time = datetime.today()
          cursor.execute("""
          INSERT INTO src_time (source_id, time)
          VALUES (%s, %s)""", [source_id, last_update_time.timestamp()])

      # fetch the email addresses to send to
      with connection as cursor:
        cursor.execute("""
        SELECT email_address
        FROM view_source_recipients
        WHERE source_id = %s""", [source_id])
        recipients = [r[0] for r in cursor]
      
      # load data from url
      try:
        data = fetch_url(url)
      except:
        logger.exception('failed to fetch reasource at %s', url)
        continue

      # parse the data
      try:
        rss = lxml.etree.fromstring(data)
      except:
        logger.debug('input was:\n%s', data)
        logger.exception('failed to parse reasource at %s', url)
        continue

      # collect updates
      channel = rss.find('channel')
      itemstosend = []
      max_pubtime = last_update_time
      for item in channel.findall('item'):
        if not has_category(item, category):
          continue
        item_pubtime = parse_rfc822(item.find('pubDate').text)
        if item_pubtime <= last_update_time:
          continue
        max_pubtime = max(max_pubtime, item_pubtime)
        itemstosend.append((item_pubtime, make_message(channel, item)))
        
      # don't continue if there's not updates to send
      if not itemstosend:
        continue

      # only send if the environment variable allows it
      if config['com.kcolford.rss.sendemails'] == 'true':
        # stop if there are too many updates, this may be the result of
        # an error
        if len(itemstosend) > int(config['com.kcolford.rss.max_updates']):
          logger.error('number of updates (%s) exceeds limit (%s)',
                       len(itemstosend),
                       config['com.kcolford.rss.max_updates'])
          continue

        # make sure we send updates in the order that they were
        # published
        itemstosend = [x[1] for x in sorted(itemstosend, key=lambda x: x[0])]

        # send out updates
        for msg in itemstosend:
          msg['From'] = config['com.kcolford.rss.smtp.from']
          for r in recipients:
            msg['To'] = r
            smtp.sendmail(msg['From'], msg['To'], msg.as_string())
            logger.info('sent email to %s', r)

      # update the last update times for this run
      with connection as cursor:
        cursor.execute("""
        UPDATE src_time SET time = %s
        WHERE source_id = %s""", [max_pubtime.timestamp(), source_id])

def main():
  """Run the main routine every 10 minutes."""

  while True:
    update_config()
    aggregate()
    logger.info('completed an update at %s', datetime.today())
    time.sleep(float(config['com.kcolford.rss.waitinterval']))

logger = logging.getLogger(__name__)
connection = None
config = {
  'com.kcolford.rss.db.host': 'db.kcolford.com',
  'com.kcolford.rss.db.user': 'rss',
  'com.kcolford.rss.db.schm': 'rss',
  'com.kcolford.rss.db.pass': os.getenv('RSS_MYSQL_PASS'),
}

if __name__ == '__main__':
  main()
