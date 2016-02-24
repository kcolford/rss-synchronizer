# -*- coding: utf-8 -*-

"""Synchronize RSS feeds and send emails.

Configuration data is stored in local MySQL database.

"""

import collections
import rfc822
import smtplib
from email.mime.text import MIMEText as EmailMessage
import logging
import time
import sys
import traceback
import functools

import pymysql as mysql
import pycurl as curl
try:
  import lxml.etree as etree
  etree.use_global_python_log(etree.PyErrorLog('rss.xmlparser'))
except ImportError:
  import xml.etree.ElementTree as etree

class RSSAggregator:
  """Aggragates RSS feeds according to database configuration."""

  user = 'rss-config'
  passwd = 'todo'
  database = 'rss'

  def __init__(self):
    
    self.conn = mysql.connect(host='localhost',
                              user=self.user,
                              passwd=self.passwd,
                              db=self.database)
    
    self.config = type('Config', (), {})()
    with self.conn as cursor:
      cursor.execute("""SELECT name, value FROM config""")
      for name, value in cursor:
        setattr(self.config, name, value)

    self.smtp = smtplib.SMTP('localhost')
    self.smtp.starttls()
    self.smtp.login(self.config.email_user, self.config.email_passwd)

    self.process_feeds()

  def process_feeds(self):
    """Process all feeds that are configured."""

    with self.conn as cursor:
      cursor.execute("""SELECT feed_id, name FROM feeds""")
      for feed_id, name in cursor:
        with self.conn as cursor:
          cursor.execute("""
          SELECT email_address 
          FROM recipients
          WHERE feed_id = %s""", [feed_id])
          self.to = ', '.join(map(lambda x: x[0], cursor))
        self.feed_name = name
        self.process_feed(feed_id)

  def process_feed(self, feed_id):
    """Process the feed identified by feed_id."""

    with self.conn as cursor:
      cursor.execute("""
      SELECT source_id, url, category
      FROM sources WHERE feed_id = %s""", [feed_id])
      for source_id, url, category in cursor:
        assert url is not None
        try:
          data = fetch_url(url)
        except:
          log.error('failed to fetch reasource at %s', url)
          continue
        try:
          d = etree.fromstring(data)
        except:
          log.error('failed to parse xml for %s\n%s', url, data)
          continue
        ch = d.find('channel')
        for it in ch.findall('item'):
          if not has_category(it, category):
            continue
          try:
            self.process_item(source_id, it)
          except:
            log.error('error while processing %s item\n%s', url,
                      etree.tostring(it))
            continue
          with self.conn as cursor:
            cursor.execute("""
            UPDATE src_time SET time = %s
            WHERE source_id = %s""", [time.time(), source_id])

  def process_item(self, source_id, it):
    """Process the item we are looking at."""

    date = time.mktime(rfc822.parsedate(it.find('pubDate').text))
    if not self.is_recent(source_id, date):
      return
    body = it.find('description').text
    link = it.find('link').text
    msg = EmailMessage(htmlize(body, link), 'html', 'utf-8')
    msg['Subject'] = '[' + self.feed_name + '] ' + it.find('title').text
    msg['From'] = self.config.email_addr
    msg['To'] = self.to
    self.smtp.sendmail(msg['From'], msg['To'], msg.as_string())
    
  def is_recent(self, source_id, date):
    """Return True if the last updated time for source_id precedes date.
    
    """

    with self.conn as cursor:
      cursor.execute("""
      SELECT time
      FROM src_time WHERE source_id = %s""", [source_id])
      try:
        sdate = next(iter(cursor))[0]
      except StopIteration:
        with self.conn as cursor:
          cursor.execute("""
          INSERT INTO src_time (source_id, time)
          VALUES (%s,%s)""", [source_id, time.time()])
        return False
    return sdate < date

def has_category(it, category):
  """Return True iff `it` has category `category`."""

  return category in [c.text for c in it.findall('category')]

def fetch_url(url):
  """Return the content found at url."""
  
  data = []
  c = curl.Curl()
  c.setopt(curl.ENCODING, '')
  c.setopt(curl.USERAGENT, 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.0')
  c.setopt(curl.FAILONERROR, True)
  c.setopt(curl.WRITEFUNCTION, data.append)
  c.setopt(curl.URL, url)
  c.perform()
  return ''.join(data)
  
def htmlize(body, link):
  """Convert a body and a link into an html message."""
  
  return ("""<!DOCTYPE html>
  <html>
  <head></head>
  <body>
  <p>""" + body + """</p>
  <p><a href=""" + link + """>Click for more.</a></p>
  </body>
  </html>
  """)

def wrap_logging_func(fn):
  """Wrap a logging function to display tracebacks."""

  @functools.wraps(fn)
  def wrapped(fmt, *args, **kwargs):
    fmt += '\n%s'
    args.append(traceback.format_exc())
    fn(fmt, *args, **kwargs)

  return wrapped

def main():
  RSSAggregator()

logging.basicConfig()
log = logging.getLogger('rss')
log.error = wrap_logging_func(log.error)

if __name__ == '__main__':
  main()
