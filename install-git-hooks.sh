#!/bin/bash

echo "Installing Git hooks.."
ln -sf ../../git-pre-push-hook.sh .git/hooks/pre-push
chmod +x .git/hooks/*
echo "Done"
