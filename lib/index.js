require('lodash')(require('fs').readdirSync(__dirname)).forEach(fname => {
    if (fname != __filename)
	exports[fname.replace(/\.js(on)?$/, '')] = require('./' + fname);
});
