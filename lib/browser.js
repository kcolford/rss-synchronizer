// http browser

var request = require('request');
var phantom = require('phantom');
var timer = require('./timer');
var log = require('./log')('browser');

function phantomresolve(url) {
    return Promise.resolve(phantom.create())
	.then(ph => {
	    return ph.createPage()
		.then(page => {
		    return page.open(url)
			.then(status => {
			    console.log(status);
			    // let the page resolve itself before we dump the
			    // content.
			    return timer.setTimeout(6 * 1000);
			})
			.then(() => {
			    return page.property('content');
			})
			.then(out => {
			    page.close();
			    return out;
			}, err => {
			    page.close();
			    throw err;
			})
		    ;
		})
		.then(out => {
		    ph.exit();
		    return out;
		}, err => {
		    ph.exit();
		    throw err;
		})
	    ;
	})
    ;
}

function standardresolve(url) {
    return new Promise((resolve, reject) => {
	request(url, {gzip: true}, (err, response, body) => {
	    if (err || response.statusCode == 200)
		return reject(err || new Error('status code was not 200'));
	    resolve(body);
	});
    });
}

module.exports = function(url) {
    log('resolving url %s', url);
    return phantomresolve(url)
	.then(null, err => {
	    log('oops, phantomjs could not fetch %s, trying the old way', url);
	    return standardresolve(url);
	});
}

