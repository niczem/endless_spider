'use strict';
var sqlite3 = require('sqlite3').verbose();


var db = new function(){

	this.connection;
	this.init = function(cb){
		this.connection = new sqlite3.Database('./chinook.db');

		//link mysql query function with sqlite run function
		this.connection.query = this.connection.run;
		if(typeof cb == 'function')
		  	cb();


	}

	this.query = function(query,cb){
		this.connection.all(query,function(error,results){
			if (error) cb(error);
		  	else cb(null, results)
		});
	}
	
	this.create_tables = function(cb){
		var create_tables = 'CREATE TABLE `sites` (\n'+
		'  `id` int(11) NOT NULL,\n'+
		'  `site_url` varchar(1000) NOT NULL,\n'+
		'  `status` smallint(3) NOT NULL\n'+
		');\n'+
		'ALTER TABLE `sites`\n'+
		'  ADD PRIMARY KEY (`id`);\n'+
		'ALTER TABLE `sites`\n'+
		'  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;\n'+
		'COMMIT;\n'+
		'CREATE TABLE `links` (\n'+
		'  `in_id` int(11) NOT NULL,\n'+
		'  `out_id` int(11) NOT NULL\n'+
		');\n'+
		'ALTER TABLE `links`\n'+
		'  ADD PRIMARY KEY (`in_id`,`out_id`);\n'+
		'COMMIT;';
		this.connection.all(create_tables, function (error, results) {
		  if (error) throw error;
		  console.log(results);
		  console.log('Tables created: ', results[0]);
		  if(typeof cb=='function')
		  cb();
		});
		this.connection.close();
	}
}


module.exports = db;
