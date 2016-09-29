// http browser

var request = require('request');
var phantom = require('phantom');
var timer = require('./timer');

module.exports = function(url) {
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
			})
			.catch(err => {
			    page.close();
			    throw err;
			})
		    ;
		})
		.then(out => {
		    ph.exit();
		    return out;
		})
		.catch(err => {
		    ph.exit();
		    throw err;
		})
	    ;
	})
	.catch(err => {
	    console.error(err);
	    return new Promise((resolve, reject) => {
		request(url, {gzip: true}, (err, response, body) => {
		    if (err || response.statusCode == 200)
			return reject(err || 'status code was not 200');
		    resolve(body);
		});
	    });
	})
    ;
}
