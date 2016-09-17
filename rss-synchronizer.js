#!/usr/bin/env node
// Daemon to send RSS updates by email

var emailer = require('nodemailer').createTransport(
  require('nodemailer-sendmail-transport')()
);
var request = require('request').defaults({
  gzip: true
});
var xml2json = require('xml2json');
var sqlite3 = require('sqlite3');
var fs = require('fs');

var db = new sqlite3.Database('data.db');

function xml(body) {
  try {
    return xml2json.toJson(body, {object: true, arrayNotation: true});
  } catch (err) {
    console.error(err);
    return null;
  }
}

function caching_request() {
  var request_cache = {};
  var old_request = request;
  return function(url, opts, cb) {
    if (url in request_cache) {
      cb.apply(null, request_cache[url]);
    }
    old_request(url, opts, function() {
      request_cache[url] = Array.from(arguments);
      cb.apply(null, arguments);
    });
  }
}

function aggregate() {

  db.serialize(function() {
    db.run(
      'create table if not exists sendto (email, url, category, last_update)'
    );

    var request = caching_request();
    db.each(
      'select *, rowid from sendto',
      function(err, row) {
	if (err)
	  return console.error('failed to fetch data from database');

	if (!row.last_update) {

	  // initialize the date field
	  db.run(
	    'update sendto set last_update = ? where rowid = ?',
	    [Date.now(), row.rowid]
	  );

	} else {

	  request(row.url, function(err, response, body) {
	    if (err || response.statusCode != 200)
	      return console.error('failed to fetch url', row.url);

	    var data = xml(body);
	    if (!data)
	      return console.error('failed to parse xml from', row.url);

	    var channel = data.rss[0].channel[0];
	    var items = channel.item || [];
	    for (var i = 0; i < items.length; i++) {

	      if (!(true &&
		    items[i] &&
		    items[i].title &&
		    items[i].title[0] &&
		    items[i].pubDate &&
		    items[i].pubDate[0] &&
		    items[i].description &&
		    items[i].description[0] &&
		    items[i].link &&
		    items[i].link[0] &&
		    true)) {
		console.error('invalid item', items[i]);
		continue;
	      }

	      // filter by category if it is given
	      if (row.category &&
		  items[i].category &&
		  items[i].category.indexOf(row.category) == -1)
		continue;

	      var pubDate = Date.parse(items[i].pubDate[0]);

	      // don't fetch something that's old
	      if (pubDate <= row.last_update)
		continue;

	      if (typeof items[i].description[0] === 'object')
		items[i].description[0] = JSON.stringify(items[i].description[0]);

	      emailer.sendMail({
		from: process.env.FROM || 'RSS <rss-noreply@kcolford.com>',
		to: row.email,
		subject: items[i].title[0],
		html: items[i].description[0] + '<br/><a href="' + items[i].link[0] + '">click here</a>'
	      }, function(err, info) {
		if (err)
		  return console.error(err);
		console.log('sent email', items[i]);

		// record the last updated entry, but
		db.run(
		  'update sendto set last_update = max(?, last_update) where rowid = ?',
		  [Date.now(), row.rowid],
		  function() {
		    console.log('updated record', arguments);
		  }
		);

	      });
	    }
	  });

	}
      }
    );
  });
}

setInterval(aggregate, 10 * 60 * 1000);
