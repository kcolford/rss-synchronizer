// database file

var assert = require('assert');
var sqlite3 = require('sqlite3');
var _ = require('lodash');

module.exports = function db(opt) {
    opt = opt || {};
    var name = opt.name || 'data.db';

    var db = new sqlite3.Database(name);
    db.serialize(() => {
	// setup metadata
	db.run('create table if not exists sendto (email, url, category, last_update)');
    });

    // return a promise of a list of target objects specified as
    // {
    //   id: id of row
    //   email: destination email
    //   url: URL to get the update from
    //   category: optional category to filter by, falsey otherwise
    //   time: last updated time of row
    // }
    this.getTargets = function() {
	return new Promise((resolve, reject) => {
	    db.all('select *, rowid from sendto', (err, rows) => {
		if (err) return reject(err);
		resolve(_.map(rows, function(row) {
		    return {
			id: row.rowid,
			email: row.email,
			url: row.url,
			category: row.category,
			time: new Date(row.last_update)
		    };
		}));
	    });
	});
    }

    // return a promise of setting the time for the row specified by id
    this.setTime = function(id, time) {
	assert(typeof id == 'number');
	assert(typeof time == 'object' && time instanceof Date);
	
	return new Promise((resolve, reject) => {
	    db.run(
		'update sendto set last_update = ? where rowid = ?',
		[time.toISOString(), id], err => {
		    if (err) return reject(err);
		    resolve();
		}
	    );
	});
    }

    this.setMaximumTime = function(id, time) {
	assert(typeof id == 'number');
	assert(typeof time == 'object' && time instanceof Date);
	
	return new Promise((resolve, reject) => {
	    db.run(
		'update sendto set last_update = max(?, last_update) where rowid = ?',
		[time, id], err => {
		    if (err) return reject(err);
		    resolve();
		}
	    );
	});
    }
}
