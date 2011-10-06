/*globals ThothSC */
ThothSC.BaseClient = SC.Object.extend({
  
  debug: true,
  
  dataSource: null,
  
  isConnected: null,
  
  isAuthenticated: false,
  
  forceAuthentication: true,
  
  userData: null,
  
  ThothURLPrefix: function(){
    if(this.dataSource && this.dataSource.ThothURLPrefix) return this.dataSource.ThothURLPrefix;
    else return '/thoth';
  }.property().cacheable(),
  
  applicationCallback: null, //will be set by the ThothSC.connect function
  
  appCallback: function(){
    if(this.applicationCallback) this.applicationCallback(arguments);
  },
  
  connect: function(){
    SC.Logger.log("Needs implementation");
  },
  
  send: function(){
    SC.Logger.log("needs implementation");
  },
  
  readyToSend: function(){
    //if(!this.isConnected) return false; // prevent loading stuff when we are not connected 
    //if(!(this.userData && this.userData.get('isAuthenticated'))) return false; // prevent loading when we are not authenticated
    
    //return true;
    console.log('needs implementation');
  },  

  /* 
    the message handling should be much easier
    we can just store the event
  */
  
  _handlers: null,
  
  on: function(event,handler){
    if(!this._handlers) this._handlers = {};
    this._handlers[event] = handler;
    this._handlersDidChange();
  },
  
  _handlersDidChange: function(){
    // default does nothing
  }
  
});