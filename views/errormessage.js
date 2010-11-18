ThothSC.ErrorMessage = SC.SheetPane.extend({
   
   message: null,
   
   dataSource: null,
  
   layout: { width: 350, height: 150, centerX: 0 },
   
   contentView: SC.View.extend({
      layout: { top: 0, right: 0, bottom: 0, left: 0 },
      childViews: "questionLabel okButton".w(),

      questionLabel: SC.LabelView.design({
         layout: { top: 30, height: 75, width: 300, centerX: 0 },
         textAlign: SC.ALIGN_CENTER,
         valueBinding: '*parentView.message'
      }),

      okButton: SC.ButtonView.design({
         layout: { bottom: 20, height: 25, width: 100, centerX: 0 },
         title: 'Ok',
         isDefault: YES,
         action: 'closeErrorMessage',
         targetBinding: '*parentView.dataSource'
      })
   })
});