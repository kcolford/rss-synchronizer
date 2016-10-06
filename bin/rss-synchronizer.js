#!/usr/bin/env node

var database = require('../lib/database');
var service = require('../lib/service');

var dbname;
var help = "\
Usage: rss-synchronizer [OPTIONS] [DATABASE]\n\
Or:    rss-synchronizer --help\n\
";

for (var i = 2; i < process.argv.length; i++) {
    var o = process.argv[i];
    if (/^--help$/.test(o)) {
	console.log(help);
	process.exit(0);
    } else {
	// not an option
	if (dbname) {
	    console.error('only one database may be specified');
	    process.exit(1);
	}
	dbname = o;
    }
}

service(new database(dbname || 'data.db'));
