#!/usr/bin/env python
# -*- coding: utf-8 -*-

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

import pymysql as mysql
import pycurl as curl
try:
  import lxml.etree as etree
  etree.use_global_python_log(etree.PyErrorLog('rss.xmlparser'))
except ImportError:
  import xml.etree.ElementTree as etree

def has_category(it, category):
  """Return True iff `it` has category `category`."""

  return category in [None] + [c.text for c in it.findall('category')]

def fetch_url(url):
  """Return the content found at url."""
  
  data = []
  c = curl.Curl()
  c.setopt(curl.ENCODING, '')
  c.setopt(curl.USERAGENT, 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.0')
  c.setopt(curl.FAILONERROR, True)
  c.setopt(curl.WRITEFUNCTION, data.append)
  c.setopt(curl.URL, url)
  try:
    c.perform()
  except:
    log.error('failed to load reasource at %s', url)
    raise
  log.debug('successfully loaded %s', url)
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
    trace = traceback.format_exc()
    if trace:
      fmt += '\n%s'
      args = list(args)
      args.append(traceback.format_exc())
    fn(fmt, *args, **kwargs)

  return wrapped

def make_message(channel, item):
  """Return an email message out of the item in channel."""

  msg = EmailMessage(("""<!DOCTYPE html>
  <html>
  <head></head>
  <body>
  <p>""" + item.find('description').text + """</p>
  <p><a href=""" + item.find('link').text + """>Click for more.</a></p>
  </body>
  </html>
  """), 'html', 'utf-8')
  msg['Subject'] = '[%s] %s' % (channel.find('title').text,
                                item.find('title').text)
  return msg

def aggregate(send_emails=True, **kwargs):
  """Aggregate all configured feeds and send out updates."""

  # establish a connection
  connection = mysql.connect(**kwargs)

  # load configuration data
  config = {}
  with connection as cursor:
    cursor.execute("""SELECT name, value FROM config""")
    for name, value in cursor:
      config[name] = value

  # connect to smtp server
  smtp = smtplib.SMTP('localhost')
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
      try:    data = fetch_url(url)
      except: continue
      log.debug('fetched %s', url)

      # parse the data
      try:    rss = etree.fromstring(data)
      except: continue
      log.debug('parsed %s', url)

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
        if len(itemstosend) > 10:
          log.error('number of updates (%s) exceeds limit (10)',
                    len(itemstosend))
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
  curl.global_init(curl.GLOBAL_DEFAULT)
  aggregate(os.getenv('RSS_SEND_EMAILS', 'y') == 'y',
            host=os.getenv('RSS_MYSQL_HOST', 'localhost'),
            user=os.getenv('RSS_MYSQL_USER', 'rss-config'),
            password=os.getenv('RSS_MYSQL_PASSWORD'),
            database=os.getenv('RSS_MYSQL_DATABASE', 'rss'))
  curl.global_cleanup()

log = logging.getLogger('rss')
log.error = wrap_logging_func(log.error)

if __name__ == '__main__':
  main()
