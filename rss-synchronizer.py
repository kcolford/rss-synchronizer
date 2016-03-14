#!/usr/bin/env python -O

"""Synchronize RSS feeds and send emails.

Configuration data is stored in local MySQL database.

"""

import os
import collections
import rfc822
import smtplib
from email.mime.text import MIMEText as EmailMessage
import logging
import time
import sys
import traceback
import functools
import getpass

import pymysql as mysql
import pycurl as curl
import lxml.etree as etree
etree.use_global_python_log(etree.PyErrorLog('xmlparser'))

def has_category(it, category):
  """Return True iff `it` has category `category`."""

  return category in [None] + [c.text for c in it.findall('category')]

def fetch_url(url):
  """Return the content found at url."""
  
  # build a standard curl object
  c = curl.Curl()
  c.setopt(curl.ENCODING, '')
  c.setopt(curl.USERAGENT, 'RSS Aggregator')
  c.setopt(curl.FOLLOWLOCATION, True)
  c.setopt(curl.FAILONERROR, True)
  c.setopt(curl.VERBOSE, False)
  c.setopt(curl.NOPROGRESS, True)

  # pass interesting parameters to it
  data = []
  c.setopt(curl.WRITEFUNCTION, data.append)
  c.setopt(curl.URL, url)
  c.perform()

  status = c.getinfo(curl.HTTP_CODE)
  log.log(logging.INFO if status == 200 else logging.ERROR,
          '%s returned status code %s', url, status)
  if status != 200:
    log.error('%s', c.errstr())
    raise Exception('Failed to fetch reasource at specified url')

  return ''.join(data)
  
def make_message(channel, item):
  """Return an email message out of the item in channel."""

  def fmt(template, arg):
    arga = item.find(arg).text
    log.debug('source %s has %s value %s', channel.find('title').text,
              arg, arga)
    return (template % arga) if arga else ''

  msg = EmailMessage(
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
  log.debug('constructed message with subject %s', msg['Subject'])
  return msg

def aggregate(send_emails=True, max_updates=10, dbparams={}):
  """Aggregate all configured feeds and send out updates."""

  # fix parameter types
  max_updates = int(max_updates)

  # establish a connection
  connection = mysql.connect(**dbparams)

  # load configuration data
  config = {}
  with connection as cursor:
    cursor.execute("""SELECT name, value FROM config""")
    for name, value in cursor:
      config[name] = value

  # connect to smtp server
  smtp = smtplib.SMTP('mail.kcolford.com')
  smtp.starttls()
  smtp.login(config['email_user'], config['email_passwd'])

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
          last_update_time = next(iter(cursor))[0]
        except StopIteration:
          log.info('source %s is new and never used before', url)
          last_update_time = time.time()
          cursor.execute("""
          INSERT INTO src_time (source_id, time)
          VALUES (%s, %s)""", [source_id, last_update_time])

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
        log.exception('failed to fetch reasource at %s', url)
        continue

      # parse the data
      try:
        rss = etree.fromstring(data)
      except:
        log.exception('failed to parse reasource at %s', url)
        continue

      # collect updates
      channel = rss.find('channel')
      itemstosend = []
      max_pubtime = last_update_time
      for item in channel.findall('item'):
        if not has_category(item, category):
          continue
        item_pubtime = item.find('pubDate').text
        item_pubtime = time.mktime(rfc822.parsedate(item_pubtime))
        if item_pubtime <= last_update_time:
          continue
        max_pubtime = max(max_pubtime, item_pubtime)
        itemstosend.append(make_message(channel, item))
        
      # don't continue if there's not updates to send
      if not itemstosend:
        continue

      # only send if the environment variable allows it
      if send_emails:
        # stop if there are too many updates, this may be the result of
        # an error
        if len(itemstosend) > max_updates:
          log.error('number of updates (%s) exceeds limit (%s)',
                    len(itemstosend), max_updates)
          continue

        # send out updates
        for msg in itemstosend:
          msg['From'] = config['email_addr']
          for r in recipients:
            msg['To'] = r
            smtp.sendmail(msg['From'], msg['To'], msg.as_string())

      # update the last update times for this run
      with connection as cursor:
        cursor.execute("""
        UPDATE src_time SET time = %s
        WHERE source_id = %s""", [max_pubtime, source_id])

def main():
  logging.basicConfig()
  if __debug__: log.setLevel(logging.DEBUG)
  else:         log.setLevel(logging.INFO)
  aggregate(send_emails=not __debug__,
            max_updates=os.getenv('RSS_MAX_UPDATES', 10),
            dbparams={'host': os.getenv('RSS_MYSQL_HOST', 'db.kcolford.com'),
                      'user': os.getenv('RSS_MYSQL_USER', 'rss'),
                      'passwd': os.getenv('RSS_MYSQL_PASS'),
                      'db': os.getenv('RSS_MYSQL_DB', 'rss')})

log = logging.getLogger()

if __name__ == '__main__':
  while True:
    main()
    log.info('completed an update')
    time.sleep(600)
