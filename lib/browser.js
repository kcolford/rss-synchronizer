// http browser

var request = require('request');
var phantom = require('phantom');
var timer = require('./timer');

module.exports = function(url) {
  return phantom.create()
    .then(ph => {
      return ph.createPage()
        .then(page => {
          return page.open(url)
            .then(status => {
              console.log(status);
              return timer.setTimeout(5 * 1000); // wait 5 sec
            })
            .then(() => {
              return page.property('content');
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
      console.error('phantomjs failed to get the requested resource',
		    err,
		    'falling back on basic http request');
      return new Promise((resolve, reject) => {
	request(url, {gzip: true}, (err, response, body) => {
	  if (err || response.statusCode == 200)
	    return reject(err || response);
	  resolve(body);
	});
      });
    })
  ;
}
