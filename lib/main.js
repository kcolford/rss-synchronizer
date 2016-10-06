// main module

var browser = require('./browser');
var database = require('./database');
var email = require('./email');
var rss = require('./rss');
var xml = require('./xml');
var log = require('./log')('main');
var _ = require('lodash');

// restrict the number of messages that will be sent to prevent
// spamming
function noSpam(messages) {
    log('checking that we are not spamming a user');
    if (messages.length > 4)
	throw new Error('too many messages to send');
    log('the messages we are sending consist of', messages);
    return messages;
}

function buildMessage(dest, message) {
    return email(dest, '[' + message.channel + '] ' + message.title,
		 message.description + '<br/><a href="' +
		 message.link + '">click here</a>');
}

function checkTarget(db, tgt) {
    if (!tgt.time)
	return db.setTime(tgt.id, new Date());
    return browser(tgt.url)
	.then(xml)
	.then(obj => {
	    return rss(obj, tgt.time, tgt.category);
	})
	.then(noSpam)
	.then(messages => {
	    return Promise.all(_.map(messages, message => {
		return buildMessage(tgt.email, message)
		    .then(() => {
			db.setMaximumTime(tgt.id, message.pubDate);
		    })
		;
	    }));
	})
    ;
}

function main(db) {
    return db.getTargets()
	.then(tgts => {
	    return Promise.all(_.map(tgts, checkTarget.bind(null, db)));
	})
    ;
}

module.exports = main;
