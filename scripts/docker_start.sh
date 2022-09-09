#!/bin/bash
docker run -d -p 3099:9000 --name attendance-management-$ATTENDANCE_MANAGEMENT_ENV attendance-management:latest
docker logs attendance-management-$ATTENDANCE_MANAGEMENT_ENV  
rm -rf /var/www/html/attendance
mkdir -p  /var/www/html/attendance

