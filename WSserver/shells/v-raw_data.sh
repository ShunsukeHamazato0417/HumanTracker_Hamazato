#!/bin/sh -xe
cd /home/endo/web/WSserver/human_detector
./get_raw_data -v -n $1&
cd ..
