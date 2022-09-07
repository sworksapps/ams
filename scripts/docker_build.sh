#!/bin/bash
docker rmi attendance-management:latest
docker build -t attendance-management:latest .
