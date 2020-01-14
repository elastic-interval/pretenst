#!/bin/sh

set -x

cd client
yarn build:fabric-engine
yarn build

cd ../../pretenst-com
rm -rf app/*
cp -r ../pretenst/client/build/* app/
git add -A
git commit -m "Publish app - $(date)"
