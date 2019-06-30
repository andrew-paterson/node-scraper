module.exports = {
  containerSelector: '.catItemViewOuter',
  fileNameSelector: '.catItemTitle', // The element that is used to create file name.
  map: [
    {
      selector: '.itemTitle',
      type: 'text',
      key: 'title'
    },
    {
      selector: '.catItemTitle',
      type: 'text',
      key: 'title'
    },
    {
      selector: '.catItemImage img',
      type: 'image',
      key: 'item_image',
      attr: 'src',
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
    {
      selector: '.itemImage img',
      type: 'image',
      key: 'item_image',
      attr: 'src',
    },
    {
      selector: '.attorney-intro-text',
      type: 'markdown',
      key: 'intro_text'
    },
    {
      selector: '.attorney-additional-text',
      type: 'markdown',
      key: 'full_text'
    },
    {
      selector: '.staff-info .Position .itemExtraFieldsValue',
      type: 'text',
      key: 'position'
    },
  ]
};