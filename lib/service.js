// run main repeatedly as a service

var main = require('./main');
var timer = require('./timer');
var database = require('./database');
var log = require('./log')('service');

module.exports = function service(db) {
    log('starting service');
    return main(db)
	.catch(err => {
	    log('there was an error in the main routine');
	    console.error(err);
	})
	.then(() => {
	    log('success in the main routine, starting timer');
	    return timer.setTimeout(10 * 60 * 1000);
	})
	.then(service.bind(null, db))
    ;
}
