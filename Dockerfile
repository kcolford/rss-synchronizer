# docker instance of the rss-synchronizer -*- mode: sh -*-
FROM python:2-onbuild
CMD python -O rss-synchronizer.py
ENV RSS_MYSQL_HOST 172.17.42.1
ENV RSS_MYSQL_USER rss
ENV RSS_MYSQL_PASS Fk6yQiG71kwGnhOxRK6O9bv3JARxk6g8
ENV RSS_MYSQL_DB rss
