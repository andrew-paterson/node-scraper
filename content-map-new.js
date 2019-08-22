module.exports = {
  contentMap: [
    {
      selector: '.itemTitle',
      type: 'text',
      key: 'title'
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
    {
      selector: '.itemListCategory h2',
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
      selector: '.catItemDateCreated',
      type: 'date',
      sourceDateFormat: 'DD mm YYYY',
      key: 'date'
    },
    {
      selector: '.catItemDateCreated',
      type: 'date',
      sourceDateFormat: 'DD mm YYYY',
      key: 'publishdate'
    },
    {
      selector: '.catItemIntroText',
      type: 'markdown',
      key: 'intro_text'
    }
  ],
  ignoreSelectors: [
    '.catItemReadMore'
  ],
  listItemSelectors: [
    {
      selector: '.itemContainer',
      urlSelector: '.catItemTitle a',
    }
  ],
  menus: [{
    menuSelector: '#main-nav ul',
    menuItemSelector: 'li',
    menuName: 'main'
  },
  {
    menuSelector: '#footer-menu .block-outer:nth-child(1) ul',
    menuItemSelector: 'li',
    menuName: 'about_us'
  },
  {
    menuSelector: '#footer-menu .block-outer:nth-child(2) ul',
    menuItemSelector: 'li',
    menuName: 'corporate'
  },
  {
    menuSelector: '#footer-menu .block-outer:nth-child(3) ul',
    menuItemSelector: 'li',
    menuName: 'individuals'
  },
  {
    menuSelector: '.copyright-inner ul',
    menuItemSelector: 'li',
    menuName: 'footer'
  }]
};