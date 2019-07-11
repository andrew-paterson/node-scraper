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
var orderedPages = scrapeConfig.map.oneToOne.orderedPages || [];
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
  var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
  return new Promise(function(resolve, reject) { 
    if (!url.match(isUrl)) {
      reject(`Invalid url: ${url}`);
    }
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

function loadDom(html) {
  var dom = new JSDOM(html).window.document;
  var window = dom.defaultView;
  var $ = require('jquery')(window);
  return $;
}

function getElementOrder(object) {
  return new Promise(function(resolve, reject) { 
    fetchHTMLPromise(object.url).then((body) => {
      var $ = loadDom(body);
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

function oneToManyPage(object) {
  return new Promise(function(resolve, reject) { 
    fetchHTMLPromise(object.url).then((body) => {
      var elementsMap = oneToMany.find(item => {
        return item.url === object.url;
      });
      // Return an array of html elements, with the object.
      var $ = loadDom(body);
      var elements = $(object.containerSelector);
      var items = [];
      $(elements).each((index, item) => {
        var html = $(item).html();
        var filename = $(item).find(object.fileNameSelector).text().trim().replace(/[^a-zA-Z\d]/g, '-').replace(/(-)\1+/g, '-').toLowerCase();
        var itemUrl = `${object.url}/${filename}`;
        if ($(item).find(object.ignoreIfSelector).length > 0) {
          // Does not create an md file from an item that contains this- eg don't create if title contains a link.
          console.log(chalk.cyan(`${filename} was skipped because it contained the ignoreIfSelector.`));
          return true; //Don't do anything.
        }
        items.push(parseContentItem(html, elementsMap, itemUrl, $));
      });
      resolve(items);
    }).catch(err => {
      reject(err);
    });
  });
}

function oneToOnePage(url, pageOrdering) {
  return new Promise(function(resolve, reject) { 
    fetchHTMLPromise(url).then((body) => {
      var elementsMap = oneToOne;
      var $ = loadDom(body);
      resolve(parseContentItem(body, elementsMap, url, $, pageOrdering));
    }).catch(err => {
      reject(err);
    });
  });
}

function createMDPromise(object) {
  var frontMatter = object.frontMatter || {};
  var content = object.content || {};
  var url = object.url;
  return new Promise(function(resolve, reject) { 
    var frontMatterDelimiter;
    if (frontMatterFormat === 'toml') {
      frontMatterDelimiter = '+++';
    } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
      frontMatterDelimiter = '---';
    }
    var final = '';
    if (frontMatterFormat === 'toml') {
      // Only for toml, because JSION doesn't have delimiters and with yml, the YAML dep adds the first delimiter for you.
      final += `${frontMatterDelimiter}\n`;
    }
    if (frontMatterFormat === 'toml') {
      final += tomlify.toToml(frontMatter, {space: 2});
    } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
      final += YAML.stringify(frontMatter);
    } else {
      if (frontMatterFormat !=='json') {
        console.log(chalk.red(`${frontMatterFormat} is not a valid output format. Use 'toml', 'yml', 'yaml' ot 'json'. JSON has been used as the default.`));
      }
      final += JSON.stringify(frontMatter, null, 2);
    }
    if (frontMatterFormat === 'toml') {
      final += `\n${frontMatterDelimiter}\n\n`;
    } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
      final += `${frontMatterDelimiter}\n\n`;
    } else {
      // When the frontMatter format is JSON, just add an empty line between the front matter and the content.
      final += '\n\n';
    }
    
    if (content.intro_text) {
      final += `${content.intro_text} \n`;
    }
    if (content.intro_text && content.full_text) {
      final += '<!--more-->\n';
    }
    if (content.full_text) {
      final += content.full_text;
    }
  
    var directory = outputDirectory || "output";
    var fullPath = nodeUrl.parse(url).path;
    var dirPath = path.dirname(fullPath);
    mkdirP(`${directory}${dirPath}`);
    var filepath = `${directory}${fullPath}.md`;
    fs.writeFile(filepath, final, function(err) {
      if(err) {
        reject(err);
      }
      resolve(`Succes! ${filepath} was saved!`);
    });
  });
}

var itemPromises = orderedPages.map(getElementOrder);
console.log('Started fetching pages to use as an ordering reference.');
Promise.all(itemPromises)
.then(pageOrdering => {
  console.log(chalk.green('Finished fetching pages to use as an ordering reference.'));
  return {pageOrdering: pageOrdering};
  
})
.then((object) => {
  console.log('Started fetching pages to use in one to many mappings.');
  var oneToManyPromises = oneToMany.map(oneToManyPage);
  return Promise.all(oneToManyPromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in one to many mappings.'));
    object.oneToMany = results;
    return object;
  });
})
.then((object) => {
  console.log('Started fetching pages to use in one to one mappings.');
  var oneToOnePromises = [];
  urls.forEach(url => {
    oneToOnePromises.push(oneToOnePage(url, object.pageOrdering));
  });
  return Promise.all(oneToOnePromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in one to one mappings.'));
    object.oneToOne = results;
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to many mappings.');
  fs.writeFile('test.json', JSON.stringify(object), function(err) {
    if(err) {
      return console.log(err);
    }
    console.log(chalk.green(`Succes!  was saved!`));
  });
  var oneToManyItems = [];
  object.oneToMany.forEach(oneToManyPage => {
    oneToManyPage.forEach(item => {
      oneToManyItems.push(item);
    });
  });
  var createMDpromises = oneToManyItems.map(createMDPromise);
  return Promise.all(createMDpromises).then(response => {
    console.log(chalk.green('Finished creating files for one to many mappings.'));
    // console.log(response);
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to one mappings.');
  var createMD121promises = object.oneToOne.map(createMDPromise);
  return Promise.all(createMD121promises).then(response => {
    console.log(chalk.green('Finished creating files for one to many mappings.'));
    // console.log(response);
    return object;
  });
})
.catch(err => {
  console.log(chalk.red(err));
});


function processUrls() {
  urls.forEach(line => {
    fetchHTML(line, 'createContent');
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

function contentItemWeight(url, frontMatterObject, pageOrdering) {
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

function parseContentItem(object, elementsMap, url, $, pageOrdering) {
  var pathname = nodeUrl.parse(url).pathname;
  var frontMatterObject = {};
  var contentObject = {};
  elementsMap.items.forEach(item => {
    var element = $(object).find(item.selector);
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
  if (pageOrdering) {
    frontMatterObject.weight = contentItemWeight(url, frontMatterObject, pageOrdering);
  }
  
  return {
    frontMatter: frontMatterObject,
    content: contentObject,
    url: url
  };
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

