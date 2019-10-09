#!/bin/sh

set -x

cd client
yarn install

build_app() {
  APP=$1
  echo "Building $APP.."
  yarn run build:"$APP"
  rm -rf /home/galapagotchi/www/"$APP"
  cp -r build /home/galapagotchi/www/"$APP"
}

# Build fabric engine, used by both apps
yarn run build:fabric-engine

# Build apps
build_app pretenst
build_app galapagotchi

# Launch Galapagotchi backend server
cd ..
docker-compose up --build -d
