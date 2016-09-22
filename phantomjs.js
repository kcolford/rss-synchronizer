#!/usr/bin/env phantomjs
var page = require('webpage').create();
page.open(require('system').args[1], function(status) {
    if (status !== 'success')
	setTimeout(function() {
	    console.log(page.content);
	    phantom.exit();
	}, 5000);
});
