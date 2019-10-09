#!/bin/sh

set -x

cd client
yarn install

build_app() {
  APP=$1
  echo "Building $APP.."
  yarn run build:fabric-engine
  yarn run build:"$APP"
  rm -rf /home/galapagotchi/www/"$APP"
  cp build /home/galapagotchi/www/"$APP"
}

# Build Pretenst
build_app pretenst
# Build Galapagotchi
build_app galapagotchi

# Launch Galapagotchi backend server
cd ..
docker-compose up --build -d
