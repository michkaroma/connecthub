#!/bin/bash
cd /var/www/html/connecthub
git pull origin main
cd frontend
npm run build
systemctl reload apache2
