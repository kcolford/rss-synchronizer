#!/bin/bash

docker stop rss
docker rm rss
docker build -t rss `dirname $_`
docker run -d --name rss rss
