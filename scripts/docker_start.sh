#!/bin/bash
docker run -d -p 3099:9000 --name attendance-management-dev attendance-management:latest
docker logs attendance-management-dev
rm -rf /var/www/html/dev-attendance/.* 
