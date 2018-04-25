
let request = require('request');
let getUrls = require('get-urls');
var mysql = require('mysql');



var db = new function(){

	this.connection;
	this.init = function(cb){
		this.connection = mysql.createConnection({
		  host: "localhost",
		  user: "root",
		  password: "abcABC!123",
		  database: 'crawler',
		  multipleStatements: true
		});

		this.connection.connect((err) => {
		  if (err) throw err;
		  console.log('Connected!');
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
	
	this.create_tables = function(){
		var create_tables = 'CREATE TABLE `sites` (\n'+
		'  `id` int(11) NOT NULL,\n'+
		'  `site_url` varchar(255) NOT NULL,\n'+
		'  `status` smallint(3) NOT NULL\n'+
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
		  console.log('Tables created: ', results[0]);
		});
		this.connection.end();
	}
}


var crawler = new function(){

	this.current_site_id;

	this.init = function(){
		debug.log('crawler initted');
		let self = this;
		db.init(()=>{
			
			self.current_site_id = 109;
			self.crawl_sites(1);
		});

	}

	this.insert_site = function(url, status, cb){

		  var records = [
		    [url, status]
		  ];
		  db.connection.query("INSERT INTO sites (site_url,status) VALUES ?", [records], function (err, result, fields) {
		    // if any error while executing above query, throw error
		    if (err) throw err;
		    // if there is no error, you have the result
		    cb(result.insertId);
		  });
	
	};

	this.insert_link = function(from_id, to_id, cb){
	
	  	var records = [
			[from_id, from_id]
		];
		db.connection.query("INSERT INTO links (in_id,out_id) VALUES ?", [records], (err,result,fields)=>{
			if(err){
				if(err.code == 'ER_DUP_ENTRY'){
					debug.log('duplicate entry \n skipping');
					cb('error');
				}
				
			}	
					
			else cb(result);
		});

	}

	//@int number_of_sites number of sites to crawl
	this.crawl_sites = function(number_of_sites){

		var condition = true;
		while(condition){	
			if(number_of_sites){
				condition = this.current_site_id < number_of_sites;
			}else{
				condition = true;
			}
			debug.log('crawling site #'+this.current_site_id);
			var self = this;
			this.get_url_by_site_id(this.current_site_id,function(url){
				self.request_site(url,function(result){
					var fromSiteId = self.current_site_id;
					var status = result.status;
					var links = self.get_links_from_html(result.content);
					var i = 0;
					debug.log(1337);
					debug.log(1337);
					debug.log(1337);
					debug.log(links.length, i);
					links.forEach(function(link,i){

						db.connection.query("SELECT * FROM sites WHERE site_url = ? LIMIT 1", [link], (err,result,fields)=>{
							if(err) throw err;
							//create new entry if it doesnt exist
							if(result.length === 0){
								self.insert_site(link, 0,(toSiteId)=>{
									self.insert_link(fromSiteId,toSiteId,(res)=>{
										debug.log(1337);
										debug.log(links.length);
										debug.log(i);
	
										if(i == links.length-1)
										self.terminateProcess();
									});
								});						
							}else{
								self.insert_site(link, 0,(toSiteId)=>{
									self.insert_link(fromSiteId, result[0].id,(res)=>{
										debug.log(1337);
										debug.log(links.length);
										debug.log(i);

										if(i == links.length-1)
										self.terminateProcess();
									});
								});
							}
						});
					});
				});
			});
			this.current_site_id++;
		}

	};

	this.get_current_site_id = function(){
		var fs = require('fs');
		var contents = fs.readFileSync('counter.txt').toString();
		return parseInt(contents);
	}
	this.terminateProcess = function(){
		var fs = require('fs');
		var stream = fs.createWriteStream("counter.txt");
		var self = this;
		self.current_site_id++;
		stream.once('open', function(fd) {
		  	stream.write((self.current_site_id+"\n");
		  	stream.end();
			process.exit(0);
		});
	}

	this.get_url_by_site_id = function(id, cb){
		debug.log('get url from site_id #'+id);
		//get url from db
		db.connection.query('SELECT * FROM sites WHERE id = ?', [id],(error,result)=>{
				if(error) debug.log(error);
				debug.log(1337);
				debug.log(result);
				debug.log(1337);
				if(result[0] && result[0].site_url)
					cb(result[0].site_url);
				else
					debug.log('could not find  site with id #'+id);
		});


	};
	this.request_site = function(url, cb){

		//HOW TO DEAL WITH FORWARDS (301) ?!?!

		debug.log('requesting site: '+url);
		var request = require('request');
		request(url, function (error, response, body) {
		  console.log('error:', error); // Print the error if one occurred
	          cb({'status':response && response.statusCode,'content':body});
		  
		});
	};
	this.get_links_from_html = function(html){

		return Array.from(getUrls(html));
	};
	this.sanitize_link = function(link){
		return sanitized_link;	
	}


	this.install = function(){
		db.init(function(){
			db.create_tables();
		});	
	}
	


}

var debug = new function(){
	this.log = function(text){
		console.log(text);
	}
}
crawler.init();
