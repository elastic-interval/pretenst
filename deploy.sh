#!/bin/sh

cd fabric
yarn
yarn asbuild:optimized
cd ../client
yarn
yarn build:prod
cd ../server
yarn
pm2 start process.yml

