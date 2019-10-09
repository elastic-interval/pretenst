#!/bin/sh

set -x

cd client
yarn install

# Build Pretenst
yarn run build:fabric-engine
yarn run build:pretenst
mv -f build/ /home/galapagotchi/www/pretenst

# Build Galapagotchi
yarn run build:fabric-engine
yarn run build:galapagotchi
mv -f build/ /home/galapagotchi/www/galapagotchi

# Launch Galapagotchi backend server
cd ..
docker-compose up --build -d
