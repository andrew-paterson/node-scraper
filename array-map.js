module.exports = {
  containerSelector: '.catItemViewOuter',
  fileNameSelector: '.catItemTitle', // The element that is used to create file name.
  ignoreIfSelector: '.catItemTitle a', // Don't save item if the element contains this selector.
  map: [
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
};