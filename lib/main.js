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
    console.log(messages);
    return messages;
}

// return the xml as a javascript object
function xml2jsObject(xml) {
    return xml2json.toJson(xml, {object: true, arrayNotation: true});
}

function buildMessage(dest, message) {
    return email(dest, '[' + message.channel + '] ' + message.title,
		 message.description + '<br/><a href="' +
		 message.link + '">click here</a>');
}

function checkTarget(db, tgt) {
    if (!tgt.time)
	return db.setTime(tgt.id, new Date());
    return Promise.resolve(browser(tgt.url))
	.then(xml2jsObject)
	.then(obj => {
	    return rss(obj, tgt.time, tgt.category);
	})
	.then(noSpam)
	.then(messages => {
	    return _.map(messages, message => {
		return Promise.resolve(buildMessage(tgt.email, message))
		    .then(() => {
			db.setMaximumTime(tgt.id, message.pubDate);
		    })
		;
	    });
	})
    ;
}

function main(db) {
    return Promise.resolve(db.getTargets())
	.then(tgts => {
	    return _.map(tgts, checkTarget.bind(null, db));
	})
    ;
}

module.exports = main;
