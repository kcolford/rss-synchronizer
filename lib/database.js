// database file

var sqlite3 = require('sqlite3');

module.exports = function db(opts) {
  opts = opts || {};
  var name = opt.name || 'data.db';

  var db = new sqlite3.Database(name);
  db.serialize(() => {
    db.run('create table if not exists sendto (email, url, category, last_update)');
  });

  this.getTargets = function() {
    return new Promise(function(resolve, reject) {
      db.all('select email, url, category, last_update as time, rowid as id from sendto', function(err, rows) {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  this.setTime = function(id, time) {
    return new Promise(function(resolve, reject) {
      db.run('update sendto set last_update = ? where rowid = ?', [time, id], function(err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  this.setMaximumTime = function(id, time) {
    return new Promise((resolve, reject) => {
      db.run('update sendto set last_update = max(?, last_update) where rowid = ?', [time, id], err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
