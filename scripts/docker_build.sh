#!/bin/bash
cd /var/www/html/dev-attendance.sworks.co.in/
docker rmi attendance-management:latest
docker build -t attendance-management:latest .
