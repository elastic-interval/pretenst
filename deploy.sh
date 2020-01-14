#!/bin/sh

set -x

cd client || exit
yarn build:fabric-engine
yarn build

cd ../../pretenst-com || exit
rm -rf app/*
cp -r ../pretenst/client/build/* app/
if [ -z "$(git diff)" ]; then
  echo "App bundle hasn't changed, skipping deployment"
  exit 0
fi
git add -A
git commit -m "Publish app - $(date)"
