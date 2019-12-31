#!/bin/bash

name="${PWD##*/}"

echo "start:${name}"

[ "${name}" == "a" ] && sleep 0.1
[ "${name}" == "b" ] && sleep 0.2
[ "${name}" == "c" ] && sleep 0.3

[ "$1" == "throw-on-b" ] && [ "${name}" == "b" ] && exit 1
[ "$1" == "throw-on-all" ] && exit 1

echo "end:${name}"
