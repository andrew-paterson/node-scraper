var fs = require('fs');
var source = process.argv[2];
var scrapeConfigFile = process.argv[3];
var scrapeConfig = require(scrapeConfigFile); 
const chalk = require('chalk');
var urls;
var contentMap = scrapeConfig.contentMap;
var listItemSelectors = scrapeConfig.listItemSelectors || [];
var menus = scrapeConfig.menus;
var ignoreSelectors = scrapeConfig.ignoreSelectors;
var lib = require('./lib2.js');
var urls;

console.log(`Started generating urls to scrape.`);
lib.generateUrls(source)
.then(response => {
  urls = response;
  console.log(chalk.green(`Finished generating urls to scrape.`));
  return 'Created URLs';
})
.then(() => {
  var fetchHTML2Promises = [];
  urls.forEach(url => {
    fetchHTML2Promises.push(lib.fetchHTML2(url));
  });
  console.log(`Started downloading HTML pages as files.`);
  return Promise.all(fetchHTML2Promises);
})
.then(htmlMap => {
  console.log(chalk.green(`Finished downloading HTML pages as files.`));
  console.log(`Started parsing downloaded HTML files.`);
  return {
    pages: lib.doListItems(htmlMap, listItemSelectors, contentMap, ignoreSelectors),
    menus: lib.doMenus(htmlMap, menus)
  };
})
.then(object => {
  fs.writeFile('console.json', JSON.stringify(object, null, 2), function(error) {
    if(error) {
      console.log(error);
    }
    console.log('Logged content to file');
  });
  console.log(chalk.green(`Finished  parsing downloaded HTML files.`));
  console.log('Started creating files.');
  var createFilePromises = [];
  object.pages.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl(item.url);
    createFilePromises.push(lib.createMDFile(item, fileOutPutPath));
  });
  createFilePromises.push(lib.createMenuFile(object.menus, lib.fileOutputPathfromUrl('/')));
  return Promise.all(createFilePromises).then(response => {
    console.log(chalk.green('Finished creating files.'));
  });
})
.catch(err => {
  console.log(chalk.red(err));
  fs.writeFile('console.json', err, function(error) {
    if(error) {
      console.log(error);
    }
    console.log('Logged content to file');
  });
});