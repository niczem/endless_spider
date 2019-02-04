const express = require('express')
const app = express()
const path = require('path');
let db = require('../db');

db.init();
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
app.get('/api/getStats', function(req, res, next){

		  db.connection.query("SELECT COUNT(id) as count_sites FROM sites; SELECT COUNT(in_id) as count_links FROM links;", function (err, result, fields) {
	
		    res.send({count_sites:result[0][0].count_sites, count_links:result[1][0].count_links});
		  });
});
app.get('/api/getIncommingLinks', function(req, res, next){
		  db.connection.query("SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links GROUP BY out_id HAVING count > 1 ORDER by count DESC;", function (err, result, fields) {
			console.log(err);
		    res.send(result);
		  });
});
app.get('/api/getCrawledSites', function(req, res, next){
		  db.connection.query("SELECT count(status ) AS count from sites WHERE status != -1;", function (err, result, fields) {
		    console.log(err);
		    res.send(result);
		  });
});
app.get('/api/getIncommingLinkDistribution', function(req, res, next){
		  db.connection.query("SELECT DISTINCT(out_id) as id, count(out_id) AS count FROM links GROUP BY out_id HAVING count > 2 ORDER by count DESC;", function (err, result, fields) {
			var distribution = {};
			result.forEach(function(value,i){
				if(typeof distribution[value.count] == 'undefined')
					distribution[value.count] = 0;
				else
					distribution[value.count]++;
				
			});
		    res.send(distribution);
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
