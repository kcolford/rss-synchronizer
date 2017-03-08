#!/bin/bash

cd "$(dirname "$0")" || exit
pacman -S --asdeps --needed nodejs npm phantomjs systemd
npm install -g
cp rss-synchronizer.service /etc/systemd/system/
systemctl daemon-reload
systemctl restart rss-synchronizer
