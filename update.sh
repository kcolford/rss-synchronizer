#!/bin/sh

cd `dirname $0`
git add -A
git commit
git push
sudo ./setup.py install
