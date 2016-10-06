// email module

var nodemailer = require('nodemailer');
var nodemailer_sendmail_transport = require('nodemailer-sendmail-transport');
var emailer = nodemailer.createTransport(nodemailer_sendmail_transport());
var log = require('./log')('email');

function email(dest, subject, body) {
    log('sending email message to %s', dest);
    return new Promise((resolve, reject) => {
	emailer.sendMail({
	    from: 'RSS <rss-noreply@kcolford.com>',
	    to: dest,
	    subject: subject,
	    html: body
	}, (err, info) => {
	    if (err) return reject(err);
	    log('sent mail status is %j', info);
	    resolve(info);
	});
    });
}

module.exports = email;
