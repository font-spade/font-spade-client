scp -r ./dist/font-spade/ loeaf@1.234.5.209:/home/loeaf/www

pm2 start /home/loeaf/www/font-spade/server/main.js --name font-spade --error /dev/null --output /dev/null
pm2 save
d
