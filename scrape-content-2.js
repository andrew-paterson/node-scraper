var fs = require('fs');
var source = process.argv[2];
var scrapeConfigFile = process.argv[3];
var scrapeConfig = require(scrapeConfigFile); 
const chalk = require('chalk');
var urls;
var sectionOrderingRefs = scrapeConfig.oneToOne.sectionOrderingRefs || [];
var oneToOne = scrapeConfig.oneToOne;
var oneToMany = scrapeConfig.oneToMany;
var sectionPages = scrapeConfig.sectionPages || [];
var listItemSelectors = scrapeConfig.listItemSelectors || [];
var menus = scrapeConfig.menus;
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
  return Promise.all(fetchHTML2Promises);
})
// .then((response) => {
  // fs.writeFile('html2.json', JSON.stringify(response, null, 2), function(err) {
  //   if(err) {
  //     console.log(err);
  //   }
  //   console.log(`Created 'html2.json'`);
  // });
//   return response;
// })
.then(htmlMap => {
  // console.log(htmlMap);
  var combinedHTMLMap = lib.doListItems(htmlMap, listItemSelectors, oneToOne);
  fs.writeFile('combinedhtml3.json', JSON.stringify(combinedHTMLMap, null, 2), function(err) { //TODO remove
    if(err) {
      console.log(err);
    }
    console.log(`Created 'combinedhtml3.json'`);
  });
  return combinedHTMLMap;
})
.then(object => {
  console.log('Started creating files for one to one mappings.');
  var createfileOneToOnepromises = [];
  object.forEach(item => {
    var fileOutPutPath = lib.fileOutputPathfromUrl(item.url);
    createfileOneToOnepromises.push(lib.createMDFile(item, fileOutPutPath));
  });
  return Promise.all(createfileOneToOnepromises).then(response => {
    console.log(chalk.green('Finished creating files for one to one mappings.'));
    return object;
  });
})
.catch(err => {
  console.log(err);
});
return;





// .then(object => {
//   console.log('Started creating file for menus.');
//   var createFileMenuPromises = [];
//   object.menus.forEach(item => {
//     var fileOutPutPath = lib.fileOutputPathfromUrl('/');
//     createFileMenuPromises.push(lib.createMenuFile(item, fileOutPutPath));
//   });
//   return Promise.all(createFileMenuPromises).then(response => {
//     console.log(chalk.green('Finished creating file for menus.'));
//     return object;
//   });
// })
// .catch(err => {
//   console.log(chalk.red(err));
//   fs.writeFile('console.json', err, function(error) {
//     if(error) {
//       console.log(error);
//     }
//     console.log('Logged content to file');
//   });
// });