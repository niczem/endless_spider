const express = require('express')
const app = express()
const path = require('path');
const fs = require("fs");

let db = require('../db');

function getIncommingLinkDistribution(){
	return new Promise(function(resolve, reject){
		db.connection.query("SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links GROUP BY out_id HAVING count > 2 ORDER by count DESC;", function (err, result, fields) {
				var distribution = {};
				result.forEach(function(value,i){
					if(typeof distribution[value.count] == 'undefined')
						distribution[value.count] = 1;
					else
						distribution[value.count]++;
				});
				console.log(distribution.length);
				fs.writeFile("data/distribution.json", JSON.stringify(distribution), (err) => {
				  if (err) reject(err);
				  console.log("Successfully written to file.");
				  resolve();
				});
		});
	});
}

function getStats(){
	return new Promise(function(resolve, reject){
		db.connection.query("SELECT COUNT(id) as count_sites FROM sites; SELECT COUNT(in_id) as count_links FROM links;", function (err, result, fields) {
			fs.writeFile("data/stats.json", JSON.stringify({count_sites:result[0][0].count_sites, count_links:result[1][0].count_links}), (err) => {
				  if (err) reject(err);
				  console.log("Successfully written to file.");
				  resolve();
			});
		});
	});
}

function getCrawledSites(){
		db.connection.query("SELECT count(status ) AS count from sites WHERE status != -1;", function (err, result, fields) {
		    console.log(err);
			fs.writeFile("data/crawledSites.json", JSON.stringify(result), (err) => {
				  if (err) console.log(err);
				  console.log("Successfully written to file.");
			});
		});
}

//load and write distribution every 5m
getIncommingLinkDistribution();
setInterval(function(){
	getIncommingLinkDistribution().then(function(){
		getStats().then(function(){
			getCrawledSites();
		});
	});
}, 360000);

db.init();
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
app.get('/api/getStats', function(req, res, next){
		fs.readFile("data/stats.json", "utf-8", (err, data) => {
			if(err)
				console.log(err);
			else
		  		res.send(data);
		});
});
app.get('/api/getIncommingLinks', function(req, res, next){
		  db.connection.query("SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links GROUP BY out_id HAVING count > 1 ORDER by count DESC;", function (err, result, fields) {
			console.log(err);
		    res.send(result);
		  });
});
app.get('/api/getCrawledSites', function(req, res, next){

		fs.readFile("data/crawledSites.json", "utf-8", (err, data) => {
			if(err)
				console.log(err);
			else
		  		res.send(data);
		});
});
app.get('/api/getIncommingLinkDistribution', function(req, res, next){

		fs.readFile("data/distribution.json", "utf-8", (err, data) => {
			if(err)
				console.log(err);
			else
		  		res.send(data);
		});
});
app.get('/api/getOutgoingLinks', function(req, res, next){
		  db.connection.query("SELECT DISTINCT(in_id) as id, count(in_id) AS count FROM links GROUP BY in_id HAVING count > 1 ORDER by count DESC;", function (err, result, fields) {
			console.log(err);
		    res.send(result);
		  });
});




app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));

app.listen(3000, () => console.log('Example app listening on port 3000!'))
