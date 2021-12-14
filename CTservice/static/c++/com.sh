#!/bin/sh -xe
g++ -Wall -O2 $1 -o $2 -lyaml-cpp -std=c++11
