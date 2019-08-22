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
var allMenus = { menu: {}};
const SitemapGenerator = require('sitemap-generator');
var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
var parseString = require('xml2js').parseString;

module.exports = {
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

  parseContentItem: function(object, contentMap, $, pageOrdering) {
    var frontMatterObject = {};
    var contentObject = {};
    contentMap.forEach(item => {
      var element = $(object.html).find(item.selector);
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
    frontMatterObject.url = object.url;
    if (object.weight) {
      frontMatterObject.weight = object.weight;
    }
    return {
      frontMatter: frontMatterObject,
      content: contentObject,
      url: object.url
    };
  },

  createMDFile: function(object, fileOutPutPath) {
    var frontMatter = object.frontMatter || {};
    var content = object.content || {};
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
        if (object.frontMatter.url === '/photographs/people-getting-married/item/112-lesley-david') {
          console.log(content.intro_text);
          console.log('-------------------------------');
          console.log((content.full_text).replace((content.intro_text).trim(), ''));
          console.log('-------------------------------');
        }
        
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

  fetchHTML2: function(url) {
    return new Promise((resolve, reject) => { 
      if (!url.match(isUrl)) {
        reject(`Invalid url: ${url}`);
      }
      request({uri: url}, (err, response, body) => { 
        if (response.statusCode === 200) {
          resolve({
            url: nodeUrl.parse(url).pathname,
            html: body
          });
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

  doMenus(htmlMap, menus) {
    htmlMap.forEach(item => {
      var $ = this.loadDom(item.html);
      menus.forEach(menuConfig => {
        if (!menuConfig.found) {
          if (menuConfig.menuName.indexOf('.') > 0) {
            console.log(chalk.red(`${menuConfig.menuName} was ignored because the menuName has dot characters, which are not allowed.`));
            return;
          }
          if (menuConfig.menuSelector) {
            menuConfig.found = true;
            var elements = $(menuConfig.menuSelector);
            if (elements.length > 0) {
              $(elements).each((index, element) => {
                var menuObjects = this.parseMenu($(element).parent().html(), $, menuConfig.menuName, menuConfig.menuItemSelector, menus);
                allMenus = this.addToObject(allMenus, menuObjects, `menu.${menuConfig.menuName}`);
                
              });
            } else {
              console.log(chalk.red(`The selector ${menuConfig.menuSelector} returned 0 elements.`));
            }
          }
        }
      });
    });
    return allMenus;
  },

  parseMenu: function(html, $, menuName, menuItemSelector, elementsMap) {
    var menuItems = $(html).children(menuItemSelector);
    var menuObjects = [];
    var weightLevel = 1;
    var processMenuItem = (menuItem, index, weightLevel, parentIdentifier) => {
      var menuItemObject = {};
      var hasChildren = $(menuItem).find(menuItemSelector).length > 0;
      var childMenu = $(menuItem).children('ul');
      var linkElement = $(menuItem).children('a').first();
      var href = $(linkElement).attr('href');
      if (hasChildren) {
        if (href) {
          var identifier = href !== '#' ? href : $(linkElement).text().replace(/' '/g, '-').toLowerCase();
            menuItemObject.identifier = identifier;
        } else {
          menuItemObject.identifier = this.immediateText(menuItem, $).replace(/' '/g, '-').toLowerCase();
        }
      }
      if (href) {
        if (href !== '#') {
          menuItemObject.url = href;
        }
        menuItemObject.name = $(linkElement).text();
      } else {
        var name = this.immediateText(menuItem, $);
        menuItemObject.name = name;
      }
      if (parentIdentifier) {
        menuItemObject.parent = parentIdentifier;
      }
      menuItemObject.weight = weightLevel + index;
      menuObjects.push(menuItemObject);
      if (hasChildren) {
        var childMenuItems = $(childMenu).children(elementsMap.menuItemSelector);
        $(childMenuItems).each((index, childMenuItem) => {
          processMenuItem(childMenuItem, index, weightLevel*10, menuItemObject.identifier);
        });
      }
    };
    $(menuItems).each((index, menuItem) => {
      processMenuItem(menuItem, index, weightLevel);
    });
    return menuObjects;
    

  },

  addToObject: function(object, value, path) {
    var levels = path.split('.');
    var acc = object;
    levels.forEach((level, index) => {
      var lastIteration = levels.length-1 === index;
      if (!acc[level]) {
        if (lastIteration) {
          acc[level] = value;
        } else {
          acc[level] = {};
        }
      } 
      acc = acc[level];
    });
    return object;
  },
  immediateText: function(element, $) {
    return $(element).clone().children().remove().end().text();
  },

  createMenuFile: function(allMenus, fileOutPutPath) {
    return new Promise((resolve, reject) => { 
      var final;
      if (frontMatterFormat === 'toml') {
        final = tomlify.toToml(allMenus, {space: 2});
      } else if (frontMatterFormat ==='yml' || frontMatterFormat ==='yaml') {
        final = YAML.stringify(allMenus);
      } else {
        if (frontMatterFormat !=='json') {
          console.log(chalk.red(`${frontMatterFormat} is not a valid output format. Use 'toml', 'yml', 'yaml' ot 'json'. JSON has been used as the default.`));
        }
        final = JSON.stringify(allMenus);
      }
      var filepath = `${outputDirectory}/menu-output.${frontMatterFormat}`;
      fs.writeFile(filepath, final, function(err) {
        if(err) {
          reject(err);
        }
        resolve(`Succes! ${filepath} was saved!`);
      });
    });
  },

  urlsFromSitemap: function(filePath) {
    var xml = fs.readFileSync(filePath, 'utf-8');
    var urls;
    parseString(xml, function (err, result) {
      urls = result.urlset.url.map(item => {
        return item.loc[0];
      });
    });
    return urls;
  },

  generateUrls: function(source) {
    return new Promise((resolve, reject) => { 
      if (!source.match(isUrl)) {
        if (path.extname(source) === '.xml') {
          urls = this.urlsFromSitemap(source);
        } else {
          urls = fs.readFileSync(source, 'utf-8').split(/\r?\n/);
        }
        if (urls) {
          resolve(urls);
        } else {
          reject('Generating URLs failed.');
        }
        
      } else {
         // create generator
         const generator = SitemapGenerator(source, {
          stripQuerystring: false,
          filepath: './temp/sitemap.xml',
        });
        // register event listeners
        generator.on('done', () => {
          // sitemaps created
          resolve(this.urlsFromSitemap('./temp/sitemap.xml'));
        });
        generator.on('error', (error) => {
          reject(error);
          // => { code: 404, message: 'Not found.', url: 'http://example.com/foo' }
        });
        // start the crawler
        generator.start();
      }
    });
  },

  doListItems: function(htmlMap, listItemSelectors, contentMap, ignoreSelectors) {
    var listItems = [];
    htmlMap.forEach(item => {
      var baseUrl = item.url.split('?')[0];
      var $ = this.loadDom(item.html);
      listItemSelectors.forEach(listItemSelector => {
        var listItemsHTML = $(listItemSelector.selector) || [];       
        $(listItemsHTML).each((index, listItem) => {
          var itemUrl;
          var listItemUrl = $(listItem).find(listItemSelector.urlSelector).attr('href');
          if (listItemUrl) {
            itemUrl = listItemUrl; // TODO must only fetch the path
          } else {
            var text = $(listItem).find('.catItemTitle').text().trim(); // TODO make dynamic
            var path = text.replace(/[^a-zA-Z\d]/g, '-').replace(/(-)\1+/g, '-').toLowerCase();
            itemUrl = `${baseUrl}/${path}`;
          }
          listItems.push({
            weight: index,
            url: itemUrl,
            html: $(listItem).html()
          });

        });
        $(listItemSelector.selector).remove();
        item.html = $('html').wrap('<div class="temp"></div>').parent().html();
      });
    });
    listItems.forEach(listItem => {
      var corresopondingHTMLMapItem = htmlMap.find(htmlMapItem => {
        return listItem.url === htmlMapItem.url;
      });
      if (corresopondingHTMLMapItem) {
        corresopondingHTMLMapItem.html += '--------------' + listItem.html;
        corresopondingHTMLMapItem.weight = listItem.weight;
      } else {
        htmlMap.push(listItem);
      }
    });
    // return htmlMap;
    var parsed = [];
    htmlMap.forEach(item => {
      var $ = this.loadDom(item.html);
      
      ignoreSelectors.forEach(selector => {
        $(selector).remove();
      });
      item.html = $('html').wrap('<div class="temp"></div>').parent().html();
      parsed.push(this.parseContentItem(item, contentMap, $));
    });
    return parsed;
  }
};