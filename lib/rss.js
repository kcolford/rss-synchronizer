// module for handling the results from an rss object

var _ = require('lodash');

module.exports = function(xmlobj, minDate, category) {
  var out = [];
  var channel = xmlobj.rss[0].channel[0];
  return _(channel.item || [])
    .map(function(item) {
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
      
      var pubDate = Date.parse(item.pubDate[0]);
      
      // don't fetch something that's old
      if (pubDate <= minDate)
        return;
      
      return {
	pubDate: pubDate,
	title: item.title,
	channel: channel.title,
	description: item.description,
	link: item.link
      };
    })
    .filter()
  ;
}
