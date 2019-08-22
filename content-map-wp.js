module.exports = {
  oneToOne: {
    items: [
      {
        selector: '.page-header',
        type: 'text',
        key: 'title'
      },
      {
        selector: '.entry-date.published',
        type: 'date',
        sourceDateFormat: 'DD mm YYYY',
        key: 'date',
        attr: 'datetime'
      },
      {
        selector: '.entry-date.published',
        type: 'date',
        sourceDateFormat: 'DD mm YYYY',
        key: 'publishdate',
        attr: 'datetime'
      },
      {
        selector: '.itemIntroText',
        type: 'markdown',
        key: 'intro_text'
      },
      {
        selector: '.entry-content .entry-content',
        type: 'markdown',
        key: 'full_text'
      },
      {
        selector: '.wp-block-image img',
        type: 'image',
        key: 'item_image',
        attr: 'src',
      }
    ]
  },
  listItemSelectors: [
    {
      selector: '.catItemViewOuter',
      urlSelectors: [
        '.catItemTitle a'
      ],
      items: {
        selector: '.catItemTitle',
        type: 'text',
        key: 'test'
      },
    }
  ],
  menus: [
    { 
      url: 'http://chemixia.cheeses-of-south-africa.com/', //Must use baseurl if not passed
      items: [
        {
          menuSelector: '#primary-menu',
          menuItemSelector: 'li',
          menuName: 'main'
        }
      ]
    }
  ]
};