module.exports = {
  map: [
    {
      selector: '.itemTitle',
      type: 'text',
      key: 'title'
    },
    {
      selector: '.itemTitles',
      type: 'text',
      key: 'titles'
    },
    {
      selector: '.itemDateCreated',
      type: 'date',
      sourceDateFormat: 'DD mm YYYY',
      key: 'date'
    },
    {
      selector: '.itemDateCreated',
      type: 'date',
      sourceDateFormat: 'DD mm YYYY',
      key: 'publishdate'
    },
    {
      selector: '.itemIntroText',
      type: 'markdown',
      key: 'intro_text'
    },
    {
      selector: '.itemFullText',
      type: 'markdown',
      key: 'full_text'
    },
  ]
};