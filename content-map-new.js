module.exports = {
  oneToOne: {
    // sectionOrderingRefs: [
    //   {
    //     url: 'https://mfwdurbanattorneys.co.za/people/attorneys',
    //     itemsSelector: 'h3.catItemTitle a',
    //     frontMatterKey: 'url' // The frontmatter value for this must match the value returned by itemsSelector to add the weight.
    //   },
    //   {
    //     url: 'https://mfwdurbanattorneys.co.za/people/support-staff',
    //     itemsSelector: 'h3.catItemTitle',
    //     frontMatterKey: 'title'
    //   }
    // ],
    items: [
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
      }
    ]
  },
  listItemSelectors: [
    {
      selector: '.itemContainer',
      urlSelector: '.catItemTitle a',
      items: [{
        selector: '.catItemTitle',
        type: 'text',
        key: 'test'
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
      }]
    }
  ],
  menus: [
    { 
      items: [
        {
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
        },
      ]
    }
  ]
};