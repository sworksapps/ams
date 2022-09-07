#
docker rmi attendance-management:latest
docker build -t attendance-management:latest .
docker run -d -p 3099:3000 --name attendance-management-dev attendance-management:latest