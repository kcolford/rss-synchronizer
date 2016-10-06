#!/bin/bash

set -eo pipefail
cd "$(dirname "$0")"

pacman -S --asdeps --needed nodejs npm phantomjs systemd
npm install -g
install -m644 rss-synchronizer.service /etc/systemd/system/
systemctl daemon-reload
systemctl restart rss-synchronizer
