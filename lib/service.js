// run main repeatedly as a service

var main = require('./main');
var timer = require('./timer');

module.exports = function service() {
  return main()
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      return timer.setTimeout(10 * 60 * 1000);
    })
    .then(service)
  ;
}
