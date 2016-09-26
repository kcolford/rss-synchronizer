// email module

var nodemailer = require('nodemailer');
var nodemailer_sendmail_transport = require('nodemailer-sendmail-transport');

var emailer = nodemailer.createTransport(nodemailer_sendmail_transport());

module.exports = function(dest, subject, body) {
  return new Promise((resolve, reject) => {
    emailer.sendMail({
      from: 'RSS <rss-noreply@kcolford.com>',
      to: dest,
      subject: subject,
      html: body
    }, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}
