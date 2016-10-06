// run main repeatedly as a service

var main = require('./main');
var timer = require('./timer');
var database = require('./database');
var debug = require('debug')('app:service');

function service(db) {
    debug('starting service');
    return main(db)
	.catch(err => {
	    debug('there was an error in the main routine');
	    console.error(err);
	})
	.then(() => {
	    debug('success in the main routine, starting timer');
	    return timer.setTimeout(10 * 60 * 1000);
	})
	.then(service.bind(null, db))
    ;
}

function start(dbname) {
    var db = new database(dbname);
    return service(db);
}

start();
