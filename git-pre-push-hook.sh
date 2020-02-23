#!/bin/bash

echo "Checking whether to deploy to production.."

BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Branch is $BRANCH"

if [ $BRANCH == "master" ]; then
	echo "Branch is master, deploying to pretenst.com"
else
	echo "Not on master, not deploying"
	exit 0
fi

./deploy.sh
