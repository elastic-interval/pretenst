#!/bin/bash

echo "Checking whether to deploy to production.."

MASTER=$(cat - | grep refs/heads/master)

if [ -n "$MASTER" ]; then
	echo "Branch is master, deploying to pretenst.com"
else
	echo "Not on master, not deploying"
	exit 0
fi

./deploy.sh
