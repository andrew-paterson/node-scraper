var jsdom = require("jsdom")
const { JSDOM } = jsdom;
var request = require('request');
var fs = require('fs');
var mapFile = process.argv[2];
var outputFormat = process.argv[3] || 'json';
var url = process.argv[4];
var elementsMap = require(mapFile); 
const chalk = require('chalk');
var YAML = require('json2yaml');
var tomlify = require('tomlify-j0.4');

var allMenus = { menu: {}};

function objectFromString(str, val = {}) {
  return str.split('.').reduceRight((acc, currentValue) => {
    return { [currentValue]: acc };
  }, val);
}

function addToObject(object, value, path) {
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
}

var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
if (url.match(isUrl)) {
  processURL(url);
} else {
  if (line.trim().split('').length > 0) {
    console.log(`${line} was ignored because it is not a URL`);
  }
}

function immediateText(element, $) {
  return $(element).clone().children().remove().end().text();
}


function parseMenu(html, $, menuName) {
  var menuItems = $(html).children(elementsMap.menuItemSelector);
  var menuObjects = [];
  var weightLevel = 1;
  var processMenuItem = (menuItem, index, weightLevel, parentIdentifier) => {
    var menuItemObject = {};
    var hasChildren = $(menuItem).find(elementsMap.menuItemSelector).length > 0;
    var childMenu = $(menuItem).children('ul');
    var linkElement = $(menuItem).children('a').first();
    var href = $(linkElement).attr('href');
    if (hasChildren) {
      if (href) {
        var identifier = href !== '#' ? href : $(linkElement).text().replace(/' '/g, '-').toLowerCase();
          menuItemObject.identifier = identifier;
      } else {
        menuItemObject.identifier = immediateText(menuItem, $).replace(/' '/g, '-').toLowerCase();
      }
    }
    if (href) {
      if (href !== '#') {
        menuItemObject.url = href;
      }
      menuItemObject.name = $(linkElement).text();
    } else {
      var name = immediateText(menuItem, $);
      menuItemObject.name = name;
    }
    if (parentIdentifier) {
      menuItemObject.parent = parentIdentifier;
    }
    menuItemObject.weight = weightLevel + index;
    menuObjects.push(menuItemObject);
    if (hasChildren) {
      var childMenuItems = $(childMenu).children(elementsMap.menuItemSelector)
      $(childMenuItems).each((index, childMenuItem) => {
        processMenuItem(childMenuItem, index, weightLevel*10, menuItemObject.identifier);
      });
    }
  };

  $(menuItems).each((index, menuItem) => {
    processMenuItem(menuItem, index, weightLevel);
  });

  allMenus = addToObject(allMenus, menuObjects, `menu.${menuName}`);
  if (outputFormat === 'toml') {
    jsToToml(allMenus);
  } else if (outputFormat ==='yml' || outputFormat ==='yaml') {
    jsToYaml(allMenus);
  } else {
    if (outputFormat !=='json') {
      console.log(chalk.red(`${outputFormat} is not a valid output format. Use 'toml', 'yml', 'yaml' ot 'json'. JSON has been used as the default.`));
    }
    console.log(JSON.stringify(allMenus));
  }
}

function jsToYaml(object) {
  console.log(YAML.stringify(object));
}
function jsToToml(object) {
  console.log('------------------');
  // console.log(tomlify.toToml(object, {space: 2}));
}

function processURL(url) {
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
    console.log(chalk.yellow(`HTML page successfully downloaded from ${url}.`));
    // These three lines allow the returned body element to be traversed with jQuery.
    const dom = new JSDOM(body).window.document;
    var window = dom.defaultView;
    var $ = require('jquery')(window);

    elementsMap.forEach(item => {
      if (item.menuName.indexOf('.') > 0) {
        console.log(chalk.red(`${item.menuName} was ignored because the menuName has dot characters, which are not allowed.`));
      }
      if (item.menuSelector) {
        var elements = $(item.menuSelector);
        $(elements).each((index, element) => {
          parseMenu($(element).parent().html(), $, item.menuName);
        });
      }
    });
  });
}