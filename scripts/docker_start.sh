#!/bin/bash
docker run  -d -p PORT:9000 --restart=always --name attendance-management-ENV attendance-management-ENV:latest
docker logs attendance-management-ENV 
rm -rf /var/www/html/attendance
mkdir -p  /var/www/html/attendance

