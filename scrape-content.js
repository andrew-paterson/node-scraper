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
var scrapeConfigFile = process.argv[3];
var frontMatterFormat = process.argv[4];
var outputDirectory = process.argv[5];
var parseString = require('xml2js').parseString;
var YAML = require('json2yaml');
var tomlify = require('tomlify-j0.4');
var scrapeConfig = require(scrapeConfigFile); 
const chalk = require('chalk');
var urls;
var preserveOrderPages = scrapeConfig.map.oneToOne.preserveOrderPages || [];
var oneToOne = scrapeConfig.map.oneToOne;
var oneToMany = scrapeConfig.map.oneToMany;


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

function fetchHTMLPromise(url) {
  return new Promise(function(resolve, reject) { 
    request({uri: url}, function(err, response, body){ 
      if (response.statusCode === 200) {
        resolve(body);
      } else {
        var errorMessage;
        if (response.statusCode === 404){
          errorMessage = `404 error. No webpage was found at ${url}`;
        } else if (response.statusCode === 401){
          errorMessage = `401 error. You are not authorised to access ${url}`;
        } else if (err && response.statusCode !== 200){
          errorMessage = `Request error: ${err}`;
        }
        reject(errorMessage);
      }
    });
  });
}

function getElementOrder(object) {
  return new Promise(function(resolve, reject) { 
    fetchHTMLPromise(object.url).then(body => {
      const dom = new JSDOM(body).window.document;
      var window = dom.defaultView;
      var $ = require('jquery')(window);
      var elements = $(object.itemsSelector);
      var links = [];
      $(elements).each((index, element) => {
        var matchValue;
        if (object.frontMatterKey === 'url') {
          matchValue = $(element).attr('href').trim();
        } else {
          matchValue = $(element).text().trim();
        }
        links.push({
          matchValue: matchValue,
          weight: index
        });
      });
      resolve({sectionUrl: object.url, matchKey: object.frontMatterKey, items: links});
    }).catch(err => {
      reject(err);
    });
  });
}

  // return new Promise(function(resolve, reject) { 
  //   request({uri: object.url}, function(err, response, body){ 
  //     if (response.statusCode === 200) {
  //       const dom = new JSDOM(body).window.document;
  //       var window = dom.defaultView;
  //       var $ = require('jquery')(window);
  //       var elements = $(object.itemsSelector);
  //       var links = [];
  //       $(elements).each((index, element) => {
  //         var matchValue;
  //         if (object.frontMatterKey === 'url') {
  //           matchValue = $(element).attr('href').trim();
  //         } else {
  //           matchValue = $(element).text().trim();
  //         }
  //         links.push({
  //           matchValue: matchValue,
  //           weight: index
  //         });
  //       });
      
  //       resolve({sectionUrl: object.url, matchKey: object.frontMatterKey, items: links});  // fulfilled successfully
  //     } else {
  //       reject(err);  // error, rejected
  //     }
  //   });
  // });
// }
var pageOrdering = [];
// if (preserveOrderPages.length > 0) {
  var itemPromises = preserveOrderPages.map(getElementOrder);
  Promise.all(itemPromises).then(results => {
    pageOrdering = results; 
    processUrls();
  }).catch(err => {
    console.log(err);
  });
// } else {
//   processUrls();
// }

function processUrls() {
  urls.forEach(line => {
    var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
    if (line.match(isUrl)) {
      fetchHTML(line, 'createContent');
    } else {
      if (line.trim().split('').length > 0) {
        console.log(`${line} was ignored because it is not a URL`);
      }
    }
  });
}

function mkdirP(dirPath) {
  mkdirp.sync(dirPath, err => {
    if (err) {
      console.error(err);
    }
  });
}

function createMD(frontMatterObject, contentObject, url) {
  var final = '';
    if (frontMatterFormat === 'toml') {
      final += tomlify.toToml(frontMatterObject, {space: 2});
    } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
      final += YAML.stringify(frontMatterObject);
    } else {
      if (frontMatterFormat !=='json') {
        console.log(chalk.red(`${frontMatterFormat} is not a valid output format. Use 'toml', 'yml', 'yaml' ot 'json'. JSON has been used as the default.`));
      }
      final += JSON.stringify(frontMatterObject);
    }

    final += '---\n\n';
    if (contentObject.intro_text) {
      final += `${contentObject.intro_text} \n`;
    }
    if (contentObject.intro_text && contentObject.full_text) {
      final += '<!--more-->\n';
    }

    if (contentObject.full_text) {
      final += contentObject.full_text;
    }

    var directory = outputDirectory || "output";
    
    var fullPath = nodeUrl.parse(url).path;
    var dirPath = path.dirname(fullPath);
    mkdirP(`${directory}${dirPath}`);
    var filepath = `${directory}${fullPath}.md`;
    fs.writeFile(filepath, final, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(chalk.green(`Succes! ${filepath} was saved!`));
    });
}

function contentItemWeight(url, frontMatterObject) {
  var pageOrderingSection = pageOrdering.find(section => {
    return url.indexOf(section.sectionUrl) > -1;
  });
  if (!pageOrderingSection) { return; }
  var pageOrderingItem = pageOrderingSection.items.find(item => {
    return item.matchValue === frontMatterObject[pageOrderingSection.matchKey];
  });
  if (!pageOrderingItem) { return; }
  return pageOrderingItem.weight;
}

function parseContentItem(test, url, $) {
  var pathname = nodeUrl.parse(url).pathname;
  var frontMatterObject = {};
  var contentObject = {};
  oneToOne.items.forEach(item => {
    var element = $(test).find(item.selector);
    if (element.length === 0) { return; }
    var text = element.text().trim();
    var html = element.html().trim();
    var src = element.attr('src');
    if (item.type === 'date') {
      var dateObject = moment(text, item.sourceDateFormat);
      text = `${moment(dateObject).format("YYYY-MM-DD")}T${moment(dateObject).format("HH:mm:ss")}+02:00`;
    }
    if (item.type === 'markdown') {
      contentObject[item.key] = toMarkdown(html);
    } else if (item.type === 'image') {
      frontMatterObject[item.key] = src;
    } else {
      frontMatterObject[item.key] = text;
    }
  });
  frontMatterObject.url = pathname;
  frontMatterObject.weight = contentItemWeight(url, frontMatterObject);
  createMD(frontMatterObject, contentObject, url);
}

function parseOneToManyHTML($, url, body) {
  // Applies to creating multiple md files from a list page
  var elements = $(elementsMap.containerSelector);
  $(elements).each((index, item) => {
    var html = $(item).html();
    var filename = $(item).find(elementsMap.fileNameSelector).text().trim().replace(/[^a-zA-Z\d]/g, '-').replace(/(-)\1+/g, '-').toLowerCase();
    var itemUrl = `${url}/${filename}`;
    if ($(item).find(elementsMap.ignoreIfSelector).length > 0) {
      // Does not create an md file from an item that contains this- eg don't create if title contains a link.
      console.log(chalk.cyan(`${filename} was skipped because it contained the ignoreIfSelector.`));
      return true; //Don't do anything.
    }
    parseContentItem(html, itemUrl, $);
  });
}

function parseHTML($, url, body) {
  if (scrapeConfig.containerSelector) {
    
  } else {
    // For creating one md page per URL.
    parseContentItem(body, url, $);
  }
}

function fetchHTML(url, afterFetch) {
  request({uri: url}, function(err, response, body){
    //Just a basic error check
    if (response.statusCode === 404){
      console.log(chalk.red('404 error. No webpage was found at ') + url);
      return;
    }
    if (response.statusCode === 401){
      console.log(chalk.red('401 error. You are not authorised to access ') + url);
      return;
    }
    if(err && response.statusCode !== 200){
      console.log(chalk.red(`Request error: ${err}`));
    }
    // These three lines allow the returned body element to be traversed with jQuery.
    const dom = new JSDOM(body).window.document;
    var window = dom.defaultView;
    var $ = require('jquery')(window);

    if (afterFetch === 'createContent') {
      parseHTML($, url, body);
    }
    
  });
}

