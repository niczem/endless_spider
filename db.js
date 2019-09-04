'use strict';
let mysql = require('mysql');

let config = require('./config/config.js');

let debug = new function(){
this.log = console.log;
};

let db = new function(){

	this.connection;
	this.init = function(cb){
		this.connection = mysql.createConnection(config.default);

		this.connection.connect((err) => {
		  if (err) throw err;
		  console.log('Connected!');
			if(typeof cb == 'function')
		  		cb();
		});


	}

	this.query = function(query,cb){
		this.connection.query(query, function (error, results, fields) {
		  if (error) cb(error);
		  else cb(null, results)
		  console.log('Tables created: ', results[0]);
		});
	}
	
	this.create_tables = function(cb){
		var create_tables = 'CREATE TABLE `sites` (\n'+
		'  `id` int(11) NOT NULL,\n'+
		'  `site_url` varchar(1000) NOT NULL,\n'+
		'  `status` smallint(3) NOT NULL,\n'+
        '  `date_added` int(11) NOT NULL,\n'+
        '  `date_crawled` int(11) NOT NULL\n'+
		') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n'+
		'ALTER TABLE `sites`\n'+
		'  ADD PRIMARY KEY (`id`);\n'+
		'ALTER TABLE `sites`\n'+
		'  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;\n'+
		'COMMIT;\n'+
		'CREATE TABLE `links` (\n'+
		'  `in_id` int(11) NOT NULL,\n'+
		'  `out_id` int(11) NOT NULL\n'+
		') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n'+
		'ALTER TABLE `links`\n'+
		'  ADD PRIMARY KEY (`in_id`,`out_id`);\n'+
		'COMMIT;';
		this.connection.query(create_tables, function (error, results, fields) {
		  if (error) throw error;
		  debug.log('Tables created: ', results[0]);
		  cb();
		});
		this.connection.end();
	}
}


module.exports = db;
