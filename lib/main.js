// main module

var browser = require('./browser');
var database = require('./database');
var email = require('./email');
var rss = require('./rss');
var xml2json = require('xml2json');
var _ = require('lodash');

// restrict the number of messages that will be sent to prevent
// spamming
function noSpam(messages) {
  if (messages.length > 4)
    throw new Error('too many messages to send');
  return messages;
}

// return the xml as a javascript object
function xml2jsObject(xml) {
  return xml2json.toJson(xml, {object: true, arrayNotation: true});
}

module.exports = function(db) {
  return db.getTargets()
    .then(rows => {
      return Promise.all(_(rows).map(row => {
	if (!row.time)
	  return db.setTime(Date.now());
	return browser(row.url)
	  .then(xml2jsObject)
	  .then(obj => {
	    return rss(obj, row.time, row.category);
	  })
	  .then(noSpam)
	  .then(messages => {
	    console.log(messages);
	    return messages;
	  })
	  .then(messages => {
	    return Promise.all(_(messages).map(message => {
	      return email(row.email,
			   '[' + message.channel + '] ' + message.title,
			   message.description + '<br/><a href="' + message.link + '">click here</a>')
		.then(() => {
		  db.setMaximumTime(row.id, message.pubDate);
		})
	      ;
	    }));
	  })
	;
      }));
    })
  ;
}
