// module for handling the results from an rss object

var _ = require('lodash');

function rss(xmlobj, minDate, category) {
    var out = [];
    var channel = xmlobj.rss[0].channel[0];
    _.map(channel.item || [], item => {
	if (!(true &&
	      item &&
	      item.title &&
	      item.title[0] &&
	      item.pubDate &&
	      item.pubDate[0] &&
	      item.description &&
	      item.description[0] &&
	      item.link &&
	      item.link[0] &&
	      true))
	    return;
	
	// filter by category if it is given
	if (category &&
	    item.category &&
	    item.category.indexOf(category) == -1)
	    return;
	
	var pubDate = new Date(item.pubDate[0]);
	
	// don't fetch something that's old
	if (pubDate <= minDate)
	    return;
	
	out.push({
	    pubDate: pubDate,
	    title: item.title,
	    channel: channel.title,
	    description: item.description,
	    link: item.link
	});
    });
    return out;
}

module.exports = rss;
