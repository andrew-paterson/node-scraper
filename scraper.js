var jsdom = require("jsdom")
const { JSDOM } = jsdom;
var request = require('request');
var toMarkdown = require('to-markdown');
var moment = require('moment');
var fs = require('fs');

var urlsFile = process.argv[2];
var mapFile = process.argv[3];

var map = require(mapFile).map; 

fs.readFileSync(urlsFile, 'utf-8').split(/\r?\n/).forEach(line => {
  var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
  if (line.match(isUrl)) {
    processURL(line);
  } else {
    if (line.trim().split('').length > 0) {
      console.log(`${line} was ignored because it is not a URL`);
    }
  }
});
var object = {};

function processURL(url) {
  request({uri: url}, function(err, response, body){
    //Just a basic error check
    if(err && response.statusCode !== 200){
      console.log('Request error.');
    }
    // These three lines allow the returned body element to be traversed with jQuery.
    const dom = new JSDOM(body).window.document;
    var window = dom.defaultView;
    var $ = require('jquery')(window);
    map.forEach(item => {
      var element = $(item.selector);
      if (element.length === 0) { return; }
      var text = element.text().trim();
      var html = element.html().trim();
      var markdown = toMarkdown(html);
      if (item.type === 'date') {
        var dateObject = moment(text, item.sourceDateFormat);
        text = `${moment(dateObject).format("YYYY-MM-DD")}T${moment(dateObject).format("HH:mm:ss")}+02:00`;
      }
      if (item.type === 'markdown') {
        object[item.key] = markdown;
      } else {
        object[item.key] = text;
      }
    });

    var final = '---\n';
    for (var key in object) {
      if (key !== 'intro_text' && key !== 'full_text') {
        final += `${key}: ${object[key]} \n`;
      }
    }
    final += '---\n\n';
    final += `${object.intro_text} \n`;
    final += '<!--more-->\n';
    final += object.full_text;

    var directory ="test";
    var slug = url.substr(url.lastIndexOf('/') + 1);
    var filepath = `${directory}/${slug}.md`
    fs.writeFile(filepath, final, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`${slug} was saved!`);
    });
  });
}

