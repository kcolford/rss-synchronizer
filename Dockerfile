# docker instance of the rss-synchronizer -*- mode: sh -*-
FROM python:onbuild
ENV TZ US/Eastern
RUN adduser --system rss
USER rss
ENV RSS_MAIL_HOST mail.kcolford.com
ENV RSS_MYSQL_HOST db.kcolford.com
ENV RSS_MYSQL_PASS Fk6yQiG71kwGnhOxRK6O9bv3JARxk6g8
CMD python -O rss-synchronizer.py
