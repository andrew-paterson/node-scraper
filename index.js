var jsdom = require("jsdom")
const { JSDOM } = jsdom;
var request = require('request');
var toMarkdown = require('to-markdown');
var moment = require('moment');
var fs = require('fs');
var nodeUrl = require('url');
var mkdirp = require('mkdirp');
var path = require('path');
var urlsFile = process.argv[2];
var mapFile = process.argv[3];
var parseString = require('xml2js').parseString;
var elementsMap = require(mapFile); 

var urls;

if (path.extname(urlsFile) === '.xml') {
  var xml = fs.readFileSync(urlsFile, 'utf-8');
  parseString(xml, function (err, result) {
    urls = result.urlset.url.map(item => {
      return item.loc[0];
    });
  });
} else {
  urls = fs.readFileSync(urlsFile, 'utf-8').split(/\r?\n/);
}

urls.forEach(line => {
  var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
  if (line.match(isUrl)) {
    processURL(line);
  } else {
    if (line.trim().split('').length > 0) {
      console.log(`${line} was ignored because it is not a URL`);
    }
  }
});


function mkdirP(dirPath) {
  mkdirp.sync(dirPath, err => {
    if (err) {
      console.error(err);
    }
  });
}

function singlePage(dom, window, $) {
  
}

function createMD(object, url) {
  var final = '---\n';
    for (var key in object) {
      if (key !== 'intro_text' && key !== 'full_text') {
        final += `${key}: ${object[key]} \n`;
      }
    }
    final += '---\n\n';
    if (object.intro_text) {
      final += `${object.intro_text} \n`;
    }
    if (object.intro_text && object.full_text) {
      final += '<!--more-->\n';
    }

    if (object.full_text) {
      final += object.full_text;
    }

    var directory ="output";
    var slug = url.substr(url.lastIndexOf('/') + 1);
    var fullPath = nodeUrl.parse(url).path;
    var dirPath = path.dirname(fullPath);
    mkdirP(`${directory}${dirPath}`);
    var filepath = `${directory}${fullPath}.md`;
    fs.writeFile(filepath, final, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`${slug} was saved!`);
    });
}

function parseContentItem(body, url, $) {
  // console.log(body);
  // console.log('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------')
  // singlePage(dom, window, $);
  var object = {};
  elementsMap.map.forEach(item => {
    var element = $(body).find(item.selector);
    if (element.length === 0) { return; }
    var text = element.text().trim();
    var html = element.html().trim();
    var src = element.attr('src');
    var markdown = toMarkdown(html);
    if (item.type === 'date') {
      var dateObject = moment(text, item.sourceDateFormat);
      text = `${moment(dateObject).format("YYYY-MM-DD")}T${moment(dateObject).format("HH:mm:ss")}+02:00`;
    }
    if (item.type === 'markdown') {
      object[item.key] = markdown;
    } else if (item.type === 'image') {
      object[item.key] = src;
    } else {
      object[item.key] = text;
    }
  });
  createMD(object, url);
}

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
    if (elementsMap.containerSelector) {
      var elements = $(elementsMap.containerSelector);
      $(elements).each((index, item) => {
        var html = $(item).html();
        var filename = $(item).find(elementsMap.fileNameSelector).text().trim().replace(/[^a-zA-Z\d]/g, '-').toLowerCase();
        var itemUrl = `${url}/${filename}`;
        parseContentItem(html, itemUrl, $);
      });
    } else {
      parseContentItem(body, url, $);
    }
  });
}

