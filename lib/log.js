// logging module

var debug = require('debug');
var packagejson = require('../package.json');

function lightlogging(modulename) {
    return debug(packagejson.name + ':' + modulename);
}

function heavylogging(modulename) {
    var name = packagejson.name + ':' + modulename;
    function log() {
	log.debug.apply(null, arguments);
    }
    log.debug = debug(name + ':debug');
    log.log = console.log.bind(console);
    log.warn = console.warn.bind(console);
    log.warning = log.warn;
    log.error = console.error.bind(console);
    log.exception = log.error;
    return log;
}

module.exports = lightlogging;
module.exports.heavylogging = heavylogging;
module.exports.lightlogging = lightlogging;
