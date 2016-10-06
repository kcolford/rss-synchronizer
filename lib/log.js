// logging module

var debug = require('debug');

module.exports = function(modulename) {
    return debug('rss-synchronizer:' + modulename);
}
