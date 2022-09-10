#!/bin/bash
docker stop attendance-management-$ATTENDANCE_MANAGEMENT_ENV
docker rm  -f attendance-management-$ATTENDANCE_MANAGEMENT_ENV

