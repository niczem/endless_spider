#Webcrawler for incoming links

##Requirements

NPM, Node, MySQL


##Install

1. Clone this repo

2. Run npm install

3. Create mysql table and modify it in ./db.js

4. Run `node crawler.js --install`

5. Add a first website (e.g. http://news.ycombinator.com) with empty status to Table sites


##Run the crawler

`node crawler.js` 


##What it can not do
 - crawl pdfs
 - crawl flash