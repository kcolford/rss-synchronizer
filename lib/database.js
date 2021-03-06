// database file

var assert = require('assert');
var sqlite3 = require('sqlite3');
var _ = require('lodash');
var log = require('./log')('database');

sqlite3.verbose();

function database(dbname) {
    assert(this, 'database should be created as an object');
    assert(dbname, 'no name given for database');

    var db = new sqlite3.Database(dbname);
    db.serialize(() => {
	// setup metadata
	db.run('create table if not exists sendto (email text, url text, category text, last_update text)');
    });
    log('finished setting up database');

    // return a promise of a list of target objects specified as
    // {
    //   id: id of row
    //   email: destination email
    //   url: URL to get the update from
    //   category: optional category to filter by, falsey otherwise
    //   time: last updated time of row
    // }
    this.getTargets = function() {
	log('fetching all targets from database');
	return new Promise((resolve, reject) => {
	    db.all('select *, rowid from sendto', (err, rows) => {
		if (err) return reject(err);
		resolve(_.map(rows, function(row) {
		    return {
			id: row.rowid,
			email: row.email,
			url: row.url,
			category: row.category,
			time: (row.last_update
			       ? new Date(row.last_update)
			       : undefined
			      )
		    };
		}));
	    });
	});
    }

    // return a promise of setting the time for the row specified by id
    this.setTime = function(id, time) {
	assert(typeof id == 'number', 'id is not a number');
	assert(time instanceof Date, 'time is not a date object');
	
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
	assert(typeof id == 'number', 'id is not a number');
	assert(time instanceof Date, 'time is not a date object');
	
	return new Promise((resolve, reject) => {
	    db.run(
		'update sendto set last_update = max(last_update, ?) where rowid = ?',
		[time.toISOString(), id], err => {
		    if (err) return reject(err);
		    resolve();
		}
	    );
	});
    }
}

module.exports = database;
