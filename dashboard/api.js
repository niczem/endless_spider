const express = require('express')
const app = express()
const path = require('path');
const fs = require("fs");

let db = require('../db');


function isInt(data){
	if(typeof data==='number' && (data%1)===0)
		return true;
	return false;
}

function getIncommingLinkDistribution(limit){
	let limitString = '';

	if(limit){
		limit = parseInt(limit);
		if(isInt(limit)){
			limitString = `WHERE in_id<='${limit}' AND  out_id<='${limit}'`;
		}else{
			throw 'limit not integer'
		}
	}

	return new Promise(function(resolve, reject){
		console.log(`SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links ${limitString} GROUP BY out_id HAVING count > 2 ORDER by count DESC;`);
		db.connection.query(`SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links ${limitString} GROUP BY out_id HAVING count > 2 ORDER by count DESC;`, function (err, result, fields) {
				var distribution = {};
				result.forEach(function(value,i){
					if(typeof distribution[value.count] == 'undefined')
						distribution[value.count] = 1;
					else
						distribution[value.count]++;
				});
				//if limit is given, do not overwrite file
				if(limit){
					  resolve(distribution);
				}else{
					fs.writeFile("data/distribution.json", JSON.stringify(distribution), (err) => {
					  if (err) reject(err);
					  console.log("Successfully written to file.");
					  resolve(distribution);
					});
				}
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
}, 7200000);

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

//either loads incoming link distribution from file if no limit is defined (otherwise it will take ages with large samples)
//see intervall function at beginning of file to see file creation
//if limit is defined sql query is run
app.get('/api/getIncommingLinkDistribution/:limit*?', function(req, res, next){

	console.log('getting incomming link distribution');
	if(req.params.limit){
		console.log('with limit '+req.params.limit);
		getIncommingLinkDistribution(req.params.limit).then(function(distribution){
		  		res.send(distribution);
		});
	}else{
		fs.readFile("data/distribution.json", "utf-8", (err, data) => {
			if(err)
				console.log(err);
			else
		  		res.send(data);
		});
	}
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

let server = app.listen(3000, () => console.log('Example app listening on port 3000!'));

server.setTimeout(720000);
