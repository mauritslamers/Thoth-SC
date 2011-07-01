/*globals ThothSC */

ThothSC.FakeClient = ThothSC.BaseClient.extend({
  
  callback: null,
  
  send: function(){
    if(this.callback) this.callback(arguments);
  },
  
  connect: function(){
    if(this.callback) this.callback(arguments);
  },
  
  appCallback: function(){
    if(this.callback) this.callback(arguments);
  }
  
});