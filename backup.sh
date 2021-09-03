#!/bin/bash
set -e
mongodump --host 172.30.25.245 --db subcellular-app --archive=/subcellular-backup/subcellular.archive -u user2O1 -p s2cYkmsX8ajMsNbY
swift --os-auth-token $OS_TOKEN --os-storage-url https://object.cscs.ch/v1/AUTH_$OS_PROJECT_ID upload subcellular_backup /subcellular-backup/subcellular.archive
