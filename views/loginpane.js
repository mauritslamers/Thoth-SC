ThothSC.LoginPane = SC.SheetPane.extend({

   dataSource: null,
  
   username: null,
   
   passwd: null,
  
   layout: { width:400, height: 200, centerX: 0 },
   contentView: SC.View.extend({
      layout: { top: 0, right: 0, bottom: 0, left: 0 },
      childViews: "loginHeaderLabel usernameLabel passwordLabel usernameInput passwordInput cancelButton loginButton".w(),

      loginHeaderLabel: SC.LabelView.design({
         layout: { height: 25, width: 250, bottom: 150, centerX: 0 },
         textAlign: SC.ALIGN_CENTER,
         value: "_loginwelcome"
      }),

      usernameLabel: SC.LabelView.design({
         layout: { height: 25, width: 150, bottom: 100, centerX: -120 },
         textAlign: SC.ALIGN_CENTER,
         value: '_username'
      }),

      passwordLabel: SC.LabelView.design({
         layout: { height: 25, width: 150, bottom: 100, centerX: 35 },
         textAlign: SC.ALIGN_CENTER,
         value: '_password'
      }),               
      
      usernameInput: SC.TextFieldView.design({
        layout: { height: 25, width: 150, bottom: 80, centerX: -80 },
        hint: 'Username...',
        valueBinding: '*parentView.username',
        isPassword: NO,
        isTextArea: NO
      }),
      
      passwordInput: SC.TextFieldView.design({
        layout: { height: 25, width: 150, bottom: 80, centerX: 80 },
        hint: 'Password...',
        valueBinding: '*parentView.passwd',
        isPassword: YES,
        isTextArea: NO
      }),
      
      cancelButton: SC.ButtonView.design({
        layout: { height: 25, width: 100, bottom: 20, centerX: 80 },
        title: "_cancel",
        action: 'closeLoginPane',
        targetBinding: '*parentView.dataSource' 
      }),
      
      loginButton: SC.ButtonView.design({
        layout: { height: 25, width: 100, bottom: 20, centerX: -80 },
        title: 'Login',
        action: 'attemptLogin',
        targetBinding: '*parentView.dataSource',
        isDefault: YES
      })
   })
});