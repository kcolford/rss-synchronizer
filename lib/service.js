// run main repeatedly as a service

var main = require('./main');
var timer = require('./timer');
var database = require('./database');

function service(db) {
  return main(db)
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      return timer.setTimeout(10 * 60 * 1000);
    })
    .then(service.bind(null, db))
  ;
}

module.exports = function(dbname) {
  var db = new database(dbname);
  return service(db);
}
