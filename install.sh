#!/bin/bash

name=rss-synchronizer

docker stop $name
docker rm $name
docker build -t $name `dirname $_`
docker run -d --restart=always --name $name $name
