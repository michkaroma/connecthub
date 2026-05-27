#!/bin/bash
cd /var/www/html/connecthub
git pull origin main
cd frontend
npm run build
/usr/bin/sudo /usr/bin/systemctl reload apache2
whoami >> /tmp/deploy.log
