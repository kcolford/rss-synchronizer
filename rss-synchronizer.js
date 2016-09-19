#!/usr/bin/env node
// Daemon to send RSS updates by email

let emailer = require('nodemailer').createTransport(
  require('nodemailer-sendmail-transport')()
);
let request = require('request').defaults({
  gzip: true
});
let xml2json = require('xml2json');
let sqlite3 = require('sqlite3');
let fs = require('fs');

let db = (function(){
  let db = new sqlite3.Database('data.db');
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
  let request_cache = {};
  let old_request = request;
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
  let request = caching_request();
  db.targets.each(function(err, row) {
    if (err)
      return console.error('failed to fetch data from database');

    if (!row.last_update) {

      // initialize the date field
      db.update_time.run(row.id, Date.now() / 1000);

    } else {

      request(row.url, function(err, response, body) {
	if (err || response.statusCode != 200)
	  return console.error('failed to fetch url', row.url);

	let data = xml(body);
	if (!data)
	  return console.error('failed to parse xml from', row.url);

	let channel = data.rss[0].channel[0];
	let items = channel.item || [];
	for (let i = 0; i < items.length; i++) {

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

	  let pubDate = Date.parse(item.pubDate[0]) / 1000;

	  // don't fetch something that's old
	  if (pubDate <= row.last_update)
	    continue;

	  emailer.sendMail({
	    from: process.env.FROM || 'RSS <rss-noreply@kcolford.com>',
	    to: row.email,
	    subject: item.title[0],
	    html: item.description[0] + '<br/><a href="' + item.link[0] + '">click here</a>'
	  }, function(err, info) {
	    if (err)
	      return console.error(err);
	    console.log('sent email', item);

	    // record the last updated entry
	    db.update_time.run(row.id, pubDate);
	    console.log('updating', row);

	  });
	}
      });

    }
  });
}

aggregate();
setInterval(aggregate, 10 * 60 * 1000);
