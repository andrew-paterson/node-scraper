var jsdom = require("jsdom");
const { JSDOM } = jsdom;
var mkdirp = require('mkdirp');
var toMarkdown = require('to-markdown');
var moment = require('moment');
var request = require('request');
var nodeUrl = require('url');
var YAML = require('json2yaml');
var tomlify = require('tomlify-j0.4');
var frontMatterFormat = process.argv[4];
var outputDirectory = process.argv[5];
var path = require('path');
var fs = require('fs');
const chalk = require('chalk');

module.exports = {
  contentItemWeight: function(url, frontMatterObject, pageOrdering) {
    var pageOrderingSection = pageOrdering.find(section => {
      return url.indexOf(section.sectionUrl) > -1;
    });
    if (!pageOrderingSection) { return; }
    var pageOrderingItem = pageOrderingSection.items.find(item => {
      return item.matchValue === frontMatterObject[pageOrderingSection.matchKey];
    });
    if (!pageOrderingItem) { return; }
    return pageOrderingItem.weight;
  },

  loadDom: function(html) {
    var dom = new JSDOM(html).window.document;
    var window = dom.defaultView;
    var $ = require('jquery')(window);
    return $;
  },
  mkdirP: function(dirPath) {
    mkdirp.sync(dirPath, err => {
      if (err) {
        console.error(err);
      }
    });
  },

  parseContentItem: function(object, elementsMap, url, $, pageOrdering) {
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
      frontMatterObject.weight = this.contentItemWeight(url, frontMatterObject, pageOrdering);
    }
    return {
      frontMatter: frontMatterObject,
      content: contentObject,
      url: url
    };
  },

  fetchHTML: function(url) {
    var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
    return new Promise((resolve, reject) => { 
      if (!url.match(isUrl)) {
        reject(`Invalid url: ${url}`);
      }
      request({uri: url}, (err, response, body) => { 
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
  },

  createMDFile: function(object, fileOutPutPath) {
    var frontMatter = object.frontMatter || {};
    var content = object.content || {};
    var url = object.url;
    return new Promise((resolve, reject) => { 
      var frontMatterDelimiter;
      if (frontMatterFormat === 'toml') {
        frontMatterDelimiter = '+++';
      } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
        frontMatterDelimiter = '---';
      }
      var final = '';
      if (frontMatterFormat === 'toml') {
        // Only for toml, because JSON doesn't have delimiters and with yml, the YAML dep adds the first delimiter for you.
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
      var directoryOutPutPath = path.dirname(fileOutPutPath);
      this.mkdirP(directoryOutPutPath);
      var filepath = fileOutPutPath;
      fs.writeFile(filepath, final, function(err) {
        if(err) {
          reject(err);
        }
        resolve(`Succes! ${filepath} was saved!`);
      });
    });
  },

  fileOutputPathfromUrl: function(url) {
    var directory = outputDirectory || "output";
    var fullPath = nodeUrl.parse(url).path;
    return `${directory}${fullPath}.md`;
  },

  getElementOrder: function(object) {
    return new Promise((resolve, reject) => { 
      this.fetchHTML(object.url).then((body) => {
        var $ = this.loadDom(body);
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
  },

  oneToManyPage: function(object, oneToMany) {
    return new Promise((resolve, reject) => { 
      this.fetchHTML(object.url).then((body) => {
        var elementsMap = oneToMany.find(item => {
          return item.url === object.url;
        });
        // Return an array of html elements, with the object.
        var $ = this.loadDom(body);
        var elements = $(object.itemSelector);
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
          items.push(this.parseContentItem(html, elementsMap, itemUrl, $));
        });
        resolve(items);
      }).catch(err => {
        reject(err);
      });
    });
  },

  oneToOnePage: function(url, pageOrdering, oneToOne) {
    return new Promise((resolve, reject) => { 
      this.fetchHTML(url).then((body) => {
        var elementsMap = oneToOne;
        var $ = this.loadDom(body);
        resolve(this.parseContentItem(body, elementsMap, url, $, pageOrdering));
      }).catch(err => {
        reject(err);
      });
    });
  },

  sectionPage: function(sectionPageObject) {
    return new Promise((resolve, reject) => { 
      this.fetchHTML(sectionPageObject.url).then((body) => {
        var elementsMap = sectionPageObject;
        var $ = this.loadDom(body);
        resolve(this.parseContentItem(body, elementsMap, sectionPageObject.url, $));
      }).catch(err => {
        reject(err);
      });
    });
  }
};