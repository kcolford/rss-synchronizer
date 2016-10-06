// run main repeatedly as a service

var main = require('./main');
var timer = require('./timer');
var database = require('./database');
var log = require('./log')('service');

function service(db) {
    log('starting service');
    return Promise.resolve(main(db))
	.then(() => {
	    log('success');
	}, err => {
	    log('encountered an error: %s', err);
	})
	.then(() => {
	    log('starting timer');
	    return timer.setTimeout(10 * 60 * 1000);
	})
	.then(service.bind(null, db))
    ;
}

module.exports = service;
