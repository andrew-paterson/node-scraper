var fs = require('fs');
var path = require('path');
// var urlsFile = process.argv[2];
var siteUrl = process.argv[2];
var scrapeConfigFile = process.argv[3];
var parseString = require('xml2js').parseString;
var scrapeConfig = require(scrapeConfigFile); 
const chalk = require('chalk');
var urls;
var sectionOrderingRefs = scrapeConfig.oneToOne.sectionOrderingRefs || [];
var oneToOne = scrapeConfig.oneToOne;
var oneToMany = scrapeConfig.oneToMany;
var sectionPages = scrapeConfig.sectionPages || [];
var menus = scrapeConfig.menus;
var lib = require('./lib.js');
var urls;

console.log(`Started generating urls to scrape.`);
lib.generateUrls(siteUrl)
.then(response => {
  urls = response;
  console.log(chalk.green(`Finished generating urls to scrape.`));
  var itemPromises = [];
  sectionOrderingRefs.forEach(item => {
    itemPromises.push(lib.getElementOrder(item));
  });
  console.log('Started fetching pages to use as an ordering reference.');
  return Promise.all(itemPromises);
})
.then(pageOrdering => {
  console.log(chalk.green('Finished fetching pages to use as an ordering reference.'));
  return {pageOrdering: pageOrdering};
})
.then((object) => {
  console.log('Started fetching pages to use in one to many mappings.');
  var oneToManyPromises = [];
  oneToMany.forEach(item => {
    oneToManyPromises.push(lib.oneToManyPage(item, oneToMany));
  });
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
    var sectionPage = sectionPages.find(sectionPage => {
      return sectionPage.url === url;
    });
    if (!sectionPage) {
      oneToOnePromises.push(lib.oneToOnePage(url, object.pageOrdering, oneToOne));
    }
  });
  return Promise.all(oneToOnePromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in one to one mappings.'));
    object.oneToOne = results;
    lib.console.file(JSON.stringify(object, null, 2));
    return object;
  });
})
.then((object) => {
  console.log('Started fetching pages to use in menu mappings.');
  var menuPromises = [];
  menus.forEach(menuObject => {
    menuPromises.push(lib.menuPromise(menuObject));
  });
  return Promise.all(menuPromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in menu mappings.'));
    object.menus = results;
    return object;
  });
})
.then(object => {
  var sectionPagePromises = [];
  sectionPages.forEach(sectionPageObject => {
    sectionPagePromises.push(lib.sectionPage(sectionPageObject));
  });
  return Promise.all(sectionPagePromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in one to one mappings.'));
    object.sectionPages = results;
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to many mappings.');
  fs.writeFile('test.json', JSON.stringify(object, null, 2), function(err) {
    if(err) {
      return console.log(err);
    }
    console.log(chalk.green(`Created JSON file`));
  });
  var oneToManyItems = [];
  object.oneToMany.forEach(oneToManyPage => {
    oneToManyPage.forEach(item => {
      oneToManyItems.push(item);
    });
  });
  var createfileOneToManypromises = [];
  oneToManyItems.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl(item.url);
    createfileOneToManypromises.push(lib.createMDFile(item, fileOutPutPath));
  });
  return Promise.all(createfileOneToManypromises).then(response => {
    console.log(chalk.green('Finished creating files for one to many mappings.'));
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to one mappings.');
  var createfileOneToOnepromises = [];
  object.oneToOne.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl(item.url);
    createfileOneToOnepromises.push(lib.createMDFile(item, fileOutPutPath));
  });
  return Promise.all(createfileOneToOnepromises).then(response => {
    console.log(chalk.green('Finished creating files for one to one mappings.'));
    return object;
  });
})
.then(object => {
  console.log('Started creating files for section pages.');
  var createfileSectionPagepromises = [];
  object.sectionPages.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl(item.url).replace('.md', '/_index.md');
    createfileSectionPagepromises.push(lib.createMDFile(item, fileOutPutPath));
  });
  return Promise.all(createfileSectionPagepromises).then(response => {
    console.log(chalk.green('Finished creating files for section pages.'));
    return object;
  });
})
.then(object => {
  console.log('Started creating file for menus.');
  var createFileMenuPromises = [];
  object.menus.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl('/');
    createFileMenuPromises.push(lib.createMenuFile(item, fileOutPutPath));
  });
  return Promise.all(createFileMenuPromises).then(response => {
    console.log(chalk.green('Finished creating file for menus.'));
    return object;
  });
})
.catch(err => {
  console.log(chalk.red(err));
});