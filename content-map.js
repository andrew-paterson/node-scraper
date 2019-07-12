module.exports = {

    oneToOne: {
      orderedPages: [
        {
          url: 'https://mfwdurbanattorneys.co.za/people/attorneys',
          itemsSelector: 'h3.catItemTitle a',
          frontMatterKey: 'url'
        },
        {
          url: 'https://mfwdurbanattorneys.co.za/people/support-staff',
          itemsSelector: 'h3.catItemTitle',
          frontMatterKey: 'title'
        }
      ],
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
      ]
    },
    oneToMany: [
      {
        url: 'https://mfwdurbanattorneys.co.za/people/support-staff',
        containerSelector: '.catItemViewOuter',
        fileNameSelector: '.catItemTitle', // The element that is used to create file name.
        ignoreIfSelector: '.catItemTitle a', // Don't save item if the element contains this selector.
        preserveOrder: true,
        items: [
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
            selector: '.staff-info .Position .itemExtraFieldsValue',
            type: 'text',
            key: 'position'
          },
        ]
      },
      {
        url: 'https://mfwdurbanattorneys.co.za/news',
        containerSelector: '.catItemViewOuter',
        fileNameSelector: '.catItemTitle', // The element that is used to create file name.
        ignoreIfSelector: '.catItemTitle a', // Don't save item if the element contains this selector.
        items: [
          {
            selector: '.catItemTitle',
            type: 'text',
            key: 'title'
          },
          {
            selector: '.catItemIntroText img',
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
        ]
      }
    ]
  
};