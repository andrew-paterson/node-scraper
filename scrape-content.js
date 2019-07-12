


var fs = require('fs');
var path = require('path');
var urlsFile = process.argv[2];
var scrapeConfigFile = process.argv[3];

var parseString = require('xml2js').parseString;
var scrapeConfig = require(scrapeConfigFile); 
const chalk = require('chalk');
var urls;
var orderedPages = scrapeConfig.oneToOne.orderedPages || [];
var oneToOne = scrapeConfig.oneToOne;
var oneToMany = scrapeConfig.oneToMany;
var lib = require('./lib.js');


// SEQUENCE OF EVENTS

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

var itemPromises = [];
orderedPages.forEach(item => {
  itemPromises.push(lib.getElementOrder(item));
});
console.log('Started fetching pages to use as an ordering reference.');
Promise.all(itemPromises)
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
    oneToOnePromises.push(lib.oneToOnePage(url, object.pageOrdering, oneToOne));
  });
  return Promise.all(oneToOnePromises).then(results => {
    console.log(chalk.green('Finished fetching pages to use in one to one mappings.'));
    object.oneToOne = results;
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to many mappings.');
  // fs.writeFile('test.json', JSON.stringify(object), function(err) {
  //   if(err) {
  //     return console.log(err);
  //   }
  //   console.log(chalk.green(`Succes!  was saved!`));
  // });
  var oneToManyItems = [];
  object.oneToMany.forEach(oneToManyPage => {
    oneToManyPage.forEach(item => {
      oneToManyItems.push(item);
    });
  });
  var createMDpromises = [];
  oneToManyItems.forEach(item => {
    createMDpromises.push(lib.createMDFile(item));
  });
  return Promise.all(createMDpromises).then(response => {
    console.log(chalk.green('Finished creating files for one to many mappings.'));
    // console.log(response);
    return object;
  });
})
.then(object => {
  console.log('Started creating files for one to one mappings.');
  var createMD121promises = [];
  object.oneToOne.forEach(item => {
    createMD121promises.push(lib.createMDFile(item));
  });
  return Promise.all(createMD121promises).then(response => {
    console.log(chalk.green('Finished creating files for one to one mappings.'));
    // console.log(response);
    return object;
  });
})
.catch(err => {
  console.log(chalk.red(err));
});