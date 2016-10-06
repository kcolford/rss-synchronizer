// return the xml as a javascript object

var xml2json = require('xml2json');
var log = require('./log')('xml');

function xml(xml) {
    log('parsing xml');
    return xml2json.toJson(xml, {object: true, arrayNotation: true});
}

module.exports = xml;
