#!/bin/bash
set -x
if [ $TRAVIS_BRANCH == 'master' ] ; then
    ssh-keyscan -H galapagotchi.run >> ~/.ssh/known_hosts
    ssh galapagotchi@galapagotchi.run "cd app && git fetch && git reset --hard origin/master && sh deploy.sh"
else
    echo "Not deploying, since this branch isn't master."
fi
