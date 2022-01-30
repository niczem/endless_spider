
import getUrls from 'get-urls';
import request from 'request';
import fs from 'fs';
import isURL from 'validator/lib/isURL.js';
import { db } from './db.js';


let start_url = 'https://news.ycombinator.com'; //<3

var crawler = new function(){

	this.current_site_id;
	this.start_site_id;
	this.start_time;
	this.init = function(){
		debug.log('crawler initted');

		this.start_time = new Date();
		this.initCleanUp();
		let self = this;
		db.init(()=>{
			self.current_site_id = self.get_current_site_id();
			self.start_site_id = self.get_current_site_id();
			self.crawl_sites(1);
		});

	}

	this.insert_site = function(url, status, cb){
		  let self = this;

		  let timestamp = Math.floor(Date.now()/1000);

		  let records = [
		    [url, status, timestamp, 0]
		  ];

		  db.connection.query("INSERT INTO sites (site_url,status, date_added, date_crawled) VALUES ?", [records], function (err, result, fields) {
			
		    debug.log('added site '+url);
		    		// if any error while executing above query, throw error
					if(err && err.code == 'ER_DATA_TOO_LONG'){
						debug.error('Link to long, skipping...')
						self.terminateProcess()
					}else if(err){
						debug.error('unknown error:');
						debug.error(err);
						self.terminateProcess()
					}else{
		    			// if there is no error, you have the result
		    			if(result&&result.insertId)
							cb(result.insertId);
						else
							cb(null);
					}
		  });
	
	};

	this.insert_link = function(from_id, to_id, cb){
		debug.log('inserting link '+from_id+' - '+to_id);
	  	var records = [
			[from_id, to_id]
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
	this.insert_and_terminate = function(link,from_id,to_id, i,links){
		var self = this;
		if(to_id === 0){
			this.insert_site(link, -1,(to_id)=>{

						debug.log('site "'+link+'" added to database');
				self.insert_link(from_id,to_id,(res)=>{
					if(i == links.length-1){
						self.terminateProcess();
					
						debug.log('all links inserted :)');
					}
				});
			});
		}else{
			self.insert_link(from_id,to_id,(res)=>{
					if(i == links.length-1){
						self.terminateProcess();
						debug.log('all links inserted:)');
					}
			});
			
		}
	}
	this.update_site_status = function(site_id, status, cb){
		let timestamp = Math.floor(Date.now()/1000);
		db.connection.query("UPDATE sites SET status=?, date_crawled=? WHERE id=?", [status,timestamp,site_id], (err,result,fields)=>{
			if(err){
				if(err.code == 'ER_DUP_ENTRY'){
					debug.log('duplicate entry \n skipping');
				}
				cb('error');
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

				//do not crawl sites like mp3, pdf etc
				var forbidden_extensions = ['gif', 'mp3', 'mp4', 'pdf', 'avi', 'jpg', 'JPG', 'jpeg'];
				if(forbidden_extensions.indexOf(url.split('.')[url.split('.').length-1]
) > -1){


					debug.log('forbidden extension, update db entry and skip url'+url);
					self.update_site_status(this.current_site_id, -2, function(){
						self.terminateProcess();
						return null;
					})
				}


				self.request_site(url,function(error,result){
					if(error){
						debug.error('error fetching '+url+' :',error);
						//update status!!
						debug.log('continue...');
						self.terminateProcess();
					}else{
						self.update_site_status(self.current_site_id,result.status,()=>{
							var fromSiteId = self.current_site_id;
							var status = result.status;
							var links = self.get_links_from_html(result.content);
							debug.log('found '+links.length+' links');
							if(links.length == 0){
								self.terminateProcess();
							}
							links.forEach(function(link,i){
								debug.log(link);
								if(isURL(link))
									db.connection.query("SELECT * FROM sites WHERE site_url = ? LIMIT 1", [link], (err,result,fields)=>{

										debug.log(link);
										if(err) debug.error(err);
										//create new entry in table sites if no entry exists
										if(result.length === 0){
											self.insert_and_terminate(link,fromSiteId,0,i,links);						
										}else{
											self.insert_and_terminate(link,fromSiteId, result[0].id,i,links);
										}
									});
								else{
									debug.error(link+'is not added to the database, not a valid url');
									if(i == links.length-1)
										self.terminateProcess();
								}
							});
						});
					}
				});
			});
			//this.current_site_id++;
		}

	};

	this.get_current_crawler_id = function(){
		db.connection.query('SELECT * FROM crawlers WHERE blocked = false', [],(error,result)=>{
				if(error){
					throw error;
				}
				console.log(result);
		});
	};

	this.get_current_site_id = function(){

		var contents = fs.readFileSync('counter.txt').toString();
		return parseInt(contents);
	};

	this.terminateProcess = function(){
		var stream = fs.createWriteStream("counter.txt");
		var self = this;
		self.current_site_id++;
		stream.once('open', function(fd) {
		  	stream.write(self.current_site_id+"\n");
		  	stream.end();
			self.crawl_sites(1);
		});
	}

	this.get_url_by_site_id = function(id, cb){
		debug.log('get url from site_id #'+id);
		//get url from db
		var self = this;
		db.connection.query('SELECT * FROM sites WHERE id = ?', [id],(error,result)=>{
				if(error){
					if(error.code == 'ER_NO_SUCH_TABLE'){
						debug.error('seems like table dont exist \n proceeding with install');
						self.install(function(){
							debug.log('install succeeded! adding first site '+start_url);
							self.insert_site(start_url, -1, function(){
								console.log('...done. restart process.');
								//process.exit(22);
							})
						});
					}else{
						console.log(error);
					}
				}else{
					if(result[0] && result[0].site_url)
						cb(result[0].site_url);
					else
						debug.log('could not find  site with id #'+id);
						self.insert_site(start_url, -1, function(){
							debug.log('...done. restart process.');
							//process.exit(22);
						});
				}
		});


	};
	this.request_site = function(url, cb){

		//HOW TO DEAL WITH FORWARDS (301) ?!?!
	
		debug.log('requesting site: "'+url+'"');
		var self = this;
		var options = {
		  url: JSON.parse( JSON.stringify( url ) ),
		  headers: {
		    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3393.4 Safari/537.36'
		  }
		};
		request(options, function (error, response, body) {
		  if(error){
			//RELOAD STATUS!
		  	console.log('error:', error); // Print the error if one occurred
			cb(error);
		  }else
	          	cb(null,{'status':response && response.statusCode,'content':body});
		  
		});
	};
	this.get_links_from_html = function(html){

		try{

			return Array.from(getUrls(html));
		}catch(e){
			debug.log(e);
			return [];		
		}
	};
	this.sanitize_link = function(link){
		return sanitized_link;	
	}


	this.install = function(cb){
		db.init(function(){
			db.create_tables(cb);
		});	
	}
	this.initCleanUp = function(){
		var self = this; //stupid name - otherwise error...
		//do cleanup before process  exits
		//https://stackoverflow.com/a/14032965

		process.stdin.resume();//so the program will not close instantly
		function exitHandler(options, err) {

		    var time_spent = Math.abs((new Date().getTime() - self.start_time.getTime())/1000);
		    var pages_crawled = self.current_site_id-self.start_site_id;
		    console.log(pages_crawled+' pages crawled in '+time_spent+'s');
		    console.log('avg time per site: '+(time_spent/pages_crawled)+'s');
		    if (options.cleanup) console.log('clean');
		    if (err) console.log(err.stack);
		    if (options.exit) process.exit();
		}
		//do something when app is closing
		process.on('exit', exitHandler.bind(null,{cleanup:true}));
		//catches ctrl+c event
		process.on('SIGINT', exitHandler.bind(null, {exit:true}));
		// catches "kill pid" (for example: nodemon restart)
		process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
		process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
		//catches uncaught exceptions
		process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
	}
	this.exportCrawl = function(){
		let crawl_id = Math.round(new Date().getTime()/1000);
		let spawn = require('child_process').spawn;
		let rimraf = require("rimraf");
		const mysqldump = require('mysqldump');

		console.log('create dir in ./exports/tmp/ with name $crawl_id');
		let dir = './exports/tmp/'+crawl_id;
		if (!fs.existsSync(dir)){
		    fs.mkdirSync(dir);
		}


		console.log('export db_sites, and links to ./exports/tmp/$crawl_id/export.sql');




 
// dump the result straight to a file

mysqldump({
    connection: {
        host: 'localhost',
        user: db.config.default.user,
        password: db.config.default.password,
        database: db.config.default.database,
    },
    dumpToFile: './exports/tmp/'+crawl_id+'/data.sql.gz',
    compressFile:true
}).then(function(){

		console.log('zip ./exports/tmp/$crawl_id/ to exports/final/$crawl_id.zip');
		console.log('zip', ['-r','./exports/tmp/'+crawl_id, './exports/final/'+crawl_id+'.zip']);
		const ls = spawn('zip', ['-r','./exports/final/'+crawl_id+'.zip','./exports/tmp/'+crawl_id]);
		ls.on('close', (code) => {
		  console.log(`child process exited with code ${code}`);
                  console.log('delete ./exports/tmp/$crawl_id/');
//                  rimraf.sync('./exports/tmp/'+crawl_id);
		});

		//truncate sites and links

		//restart crawler
});
	}
}

var debug = new function(){
	this.log = function(text){
		console.log(text);
	}
	this.error = function(text){
		console.log("\x1b[31m",text,'\x1b[0m');
	}
}

var args = process.argv.slice(2);
if(typeof args[0] !== 'undefined' && args[0] == '--install'){
	crawler.install();
}else if(typeof args[0] !== 'undefined' && args[0] == '--export'){
console.log(db);
	crawler.exportCrawl();
}else{
	crawler.init();
}
