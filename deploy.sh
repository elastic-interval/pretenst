#!/bin/sh

set -x

yarn
cd fabric
yarn
yarn asbuild:optimized
cd ../client
yarn
yarn build:prod
docker-compose up --build -d
