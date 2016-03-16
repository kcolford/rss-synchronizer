# docker instance of the rss-synchronizer -*- mode: sh -*-
FROM python:onbuild
CMD python -O rss-synchronizer.py
ENV TZ US/Eastern
ENV RSS_MYSQL_PASS Fk6yQiG71kwGnhOxRK6O9bv3JARxk6g8
