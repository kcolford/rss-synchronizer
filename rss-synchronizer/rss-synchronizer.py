# -*- coding: utf-8 -*-

"""Synchronize RSS feeds and send emails.

Configuration data is stored in local MySQL database.

"""

import lxml
import pycurl as curl
import cymysql as mysql

def main():
    """Run the sync process."""

    conn = mysql.connect(user='rss-config', passwd='todo', db='rss')
    with conn.cursor() as cursor:
        for i in cursor.execute('SELECT feed_id FROM feeds'):
            i.feed_id
