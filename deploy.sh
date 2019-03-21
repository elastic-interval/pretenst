#!/bin/sh

cd fabric
yarn
yarn asbuild:optimized
cd ..
cd client
yarn
yarn build:prod
cd ..
cd server
yarn
pm2 restart server

