#!/bin/bash

mkdir sf

pushd sf

wget --no-check-certificate https://204.68.210.15/food/SFBusinesses11282012.zip

unzip SFBusinesses11282012.zip

rm SFBusinesses11282012.zip

popd

pushd nyc

wget https://nycopendata.socrata.com/download/4vkw-7nck/ZIP

unzip ZIP

rm ZIP
