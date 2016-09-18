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

var db = (function(){
  var db = new sqlite3.Database('data.db');
  db.serialize();
  db.run('create table if not exists sendto (email, url, category, last_update)');
  db.parallelize();
  return {
    serialize: db.serialize.bind(db),
    parallelize: db.parallelize.bind(db),
    targets: db.prepare('select *, rowid as id from sendto'),
    update_time:db.prepare('update sendto set last_update = max(?2, ifnull(last_update, 0)) where rowid = ?1')
  };
})();

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
  var request = caching_request();
  db.targets.each(function(err, row) {
    if (err)
      return console.error('failed to fetch data from database');

    if (!row.last_update) {

      // initialize the date field
      db.update_time.run(row.id, Date.now());

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

	  let item = items[i];

	  if (!(true &&
		item &&
		item.title &&
		item.title[0] &&
		item.pubDate &&
		item.pubDate[0] &&
		item.description &&
		item.description[0] &&
		item.link &&
		item.link[0] &&
		true)) {
	    console.error('invalid item', item);
	    continue;
	  }

	  // filter by category if it is given
	  if (row.category &&
	      item.category &&
	      item.category.indexOf(row.category) == -1)
	    continue;

	  var pubDate = Date.parse(item.pubDate[0]);

	  // don't fetch something that's old
	  if (pubDate <= row.last_update)
	    continue;

	  if (typeof item.description[0] === 'object')
	    item.description[0] = JSON.stringify(item.description[0]);

	  emailer.sendMail({
	    from: process.env.FROM || 'RSS <rss-noreply@kcolford.com>',
	    to: row.email,
	    subject: item.title[0],
	    html: item.description[0] + '<br/><a href="' + item.link[0] + '">click here</a>'
	  }, function(err, info) {
	    if (err)
	      return console.error(err);
	    console.log('sent email', item);

	    // record the last updated entry, but
	    db.update_time.run(row.id, Date.now());
	    console.log('updating', row);

	  });
	}
      });

    }
  });
}

aggregate();
setInterval(aggregate, 10 * 60 * 1000);
