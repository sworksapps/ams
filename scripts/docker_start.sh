#!/bin/bash
docker run -d -p 3089:9000 --name attendance-management-uat attendance-management-uat:latest
docker logs attendance-management-uat  
#rm -rf /var/www/html/attendance-uat
mkdir -p  /var/www/html/attendance-uat

