var jsdom = require("jsdom")
const { JSDOM } = jsdom;
var request = require('request');
var toMarkdown = require('to-markdown');
var moment = require('moment');
var fs = require('fs');
var nodeUrl = require('url');
var mkdirp = require('mkdirp');
var path = require('path');
var mapFile = process.argv[2];
var parseString = require('xml2js').parseString;
var elementsMap = require(mapFile); 
const chalk = require('chalk');

var url = 'https://mfwdurbanattorneys.co.za';

var isUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
if (url.match(isUrl)) {
  // processURL(url);
} else {
  if (line.trim().split('').length > 0) {
    console.log(`${line} was ignored because it is not a URL`);
  }
}

var html = `<ul class="nav menu mod-list">
<li class="item-101 default current active"><a href="/">Home</a></li><li class="item-180 deeper parent">People<ul class="nav-child unstyled small"><li class="item-181"><a href="/people/attorneys">Attorneys</a></li><li class="item-182"><a href="/people/support-staff">Support Staff</a></li></ul></li><li class="item-269"><a href="/about-us">About Us</a></li><li class="item-270 deeper parent"><a href="#">Services</a><ul class="nav-child unstyled small"><li class="item-282"><a href="/services/alternative-dispute-resolution">Alternative Dispute Resolution</a></li><li class="item-277"><a href="/services/civil-litigation">Civil Litigation</a></li><li class="item-279"><a href="/services/commercial-law">Commercial Law</a></li><li class="item-280"><a href="/services/criminal-law">Criminal Law</a></li><li class="item-283"><a href="/services/estates">Estates</a></li><li class="item-284"><a href="/services/family-law">Family Law</a></li><li class="item-278"><a href="/services/labour-and-employment">Labour and Employment Law</a></li><li class="item-281"><a href="/services/liquor-licences">Liquor Licences</a></li><li class="item-276"><a href="/services/property-conveyancing">Property – Conveyancing</a></li></ul></li><li class="item-271"><a href="/news">News</a></li><li class="item-272"><a href="/legally-speaking">Legally Speaking</a></li><li class="item-140"><a href="/contact">Contact</a></li><li class="item-292">Search</li></ul>`;

function immediateText(element, $) {
  return $(element).clone().children().remove().end().text();
}
function parseMenu(html) {
  const dom = new JSDOM(html).window.document;
  var window = dom.defaultView;
  var $ = require('jquery')(window);
  var menuItems = $(html).children(elementsMap.menuItemSelector);
  var menuObjects = [];
  var weightLevel = 1;
  var processMenuItem = (menuItem, index, weightLevel, parentIdentifier) => {
    var menuObject = {};
    var hasChildren = $(menuItem).find(elementsMap.menuItemSelector).length > 0;
    var childMenu = $(menuItem).children('ul');
    var linkElement = $(menuItem).children('a').first();
    var href = $(linkElement).attr('href');
    if (hasChildren) {
      if (href) {
        var identifier = href !== '#' ? href : $(linkElement).text().replace(/' '/g, '-').toLowerCase();
          menuObject.identifier = identifier;
      } else {
        menuObject.identifier = immediateText(menuItem, $).replace(/' '/g, '-').toLowerCase();
      }
    }
    if (href) {
      if (href !== '#') {
        menuObject.href = href;
      }
      menuObject.name = $(linkElement).text();
    } else {
      var name = immediateText(menuItem, $);
      menuObject.name = name;
    }
    if (parentIdentifier) {
      menuObject.parent = parentIdentifier;
    }
    menuObject.weight = weightLevel + index;
    menuObjects.push(menuObject);
    if (hasChildren) {
      var childMenuItems = $(childMenu).children(elementsMap.menuItemSelector)
      $(childMenuItems).each((index, childMenuItem) => {
        processMenuItem(childMenuItem, index, weightLevel*10, menuObject.identifier);
      });
    }
  };

  $(menuItems).each((index, menuItem) => {
    processMenuItem(menuItem, index, weightLevel);
  });
  console.log(menuObjects);
}

parseMenu(html);
// function mkdirP(dirPath) {
//   mkdirp.sync(dirPath, err => {
//     if (err) {
//       console.error(err);
//     }
//   });
// }

// function createMD(object, url) {
//   var final = '---\n';
//     for (var key in object) {
//       if (key !== 'intro_text' && key !== 'full_text') {
//         final += `${key}: ${object[key]} \n`;
//       }
//     }
//     final += '---\n\n';
//     if (object.intro_text) {
//       final += `${object.intro_text} \n`;
//     }
//     if (object.intro_text && object.full_text) {
//       final += '<!--more-->\n';
//     }

//     if (object.full_text) {
//       final += object.full_text;
//     }

//     var directory ="output";
//     var slug = url.substr(url.lastIndexOf('/') + 1);
//     var fullPath = nodeUrl.parse(url).path;
//     var dirPath = path.dirname(fullPath);
//     mkdirP(`${directory}${dirPath}`);
//     var filepath = `${directory}${fullPath}.md`;
//     fs.writeFile(filepath, final, function(err) {
//       if(err) {
//         return console.log(err);
//       }
//       console.log(chalk.green('Succes! ') + `${filepath}` + chalk.green(' was saved!'));
//     });
// }

// function parseContentItem(test, url, $) {
//   var object = {};
//   elementsMap.map.forEach(item => {
//     var element = $(test).find(item.selector);
//     if (element.length === 0) { return; }
//     var text = element.text().trim();
//     var html = element.html().trim();
//     var src = element.attr('src');
//     var markdown = toMarkdown(html);
//     if (item.type === 'date') {
//       var dateObject = moment(text, item.sourceDateFormat);
//       text = `${moment(dateObject).format("YYYY-MM-DD")}T${moment(dateObject).format("HH:mm:ss")}+02:00`;
//     }
//     if (item.type === 'markdown') {
//       object[item.key] = markdown;
//     } else if (item.type === 'image') {
//       object[item.key] = src;
//     } else {
//       object[item.key] = text;
//     }
//   });
//   createMD(object, url);
// }

function processURL(url) {
  console.log(url);
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
    if (elementsMap.menuSelector) {
      var element = $(elementsMap.menuSelector);
      console.log(element.parent().html());
      // parseContentItem(body, url, $);
    }
  });
}