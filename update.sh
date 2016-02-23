#!/bin/sh

git add -A
git commit
git push
sudo `dirname $0`/setup.py install
