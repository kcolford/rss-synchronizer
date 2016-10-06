// timer module

var log = require('./log')('timer');

function pSetTimeout(ms) {
    return new Promise((resolve, reject) => {
	setTimeout(resolve, ms);
    });
}

module.exports = {
    setTimeout: pSetTimeout
};
