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
  
  /* Message handling
  a special message handler is a function handling a non-data message from the server.
  when the function is registered, the function will be called whenever the server sends a message
  using the traffic specification (websocket or long polling)
  function(message){ // when handled return true, when not applicable return false};
  
  */
  _specialMessageHandlers: null,
  _specialMessageEvents: null,
  
  registerSpecialMessageHandler: function(func,evt){
    if(!this._specialMessageHandlers) this._specialMessageHandlers=[];
    if(!this._specialMessageEvents) this._specialMessageEvents=[];
    if(evt){
      if(this._specialMessageEvents.indexOf(evt) !== -1) return;
      else this._specialMessageEvents.push(evt);
    }
    if(this._specialMessageHandlers.indexOf(func) === -1) this._specialMessageHandlers.push(func);
  },
  
  unregisterSpecialMessageHandler: function(func,event){
    var index = this._specialMessageHandlers.indexOf(func);
    if(index !== -1) {
      this._specialMessageHandlers.removeAt(index);
      this._specialMessageEvents.removeObject(event);
    }
  },
  
  _dataMessageHandlers: null,
  _dataMessageEvents: null,
  
  registerDataMessageHandler: function(func,evt){
    if(!this._dataMessageHandlers) this._dataMessageHandlers = [];
    if(!this._dataMessageEvents) this._dataMessageEvents = [];
    if(evt){
      if(this._dataMessageEvents.indexOf(evt) !== -1) return;
      else this._dataMessageEvents.push(evt);
    }
    if(this._dataMessageHandlers.indexOf(func) === -1) this._dataMessageHandlers.push(func);
  },
  
  unregisterDataMessageHandler: function(func,event){
    var index = this._dataMessageHandlers.indexOf(func);
    if(index !== -1){
      this._dataMessageHandlers.removeAt(index);
      this._dataMessageEvents.removeObject(event);
    } 
  },
  
	messageHandler: function(event){
		var me = this;
		
		var specHandlers = this._specialMessageHandlers;
		var dataHandlers = this._dataMessageHandlers;
		
		var specialMsgHandler = function(m){
		  var i, len = specHandlers? specHandlers.length: 0;
		  for(i=0;i<len;i+=1){
		    if(specHandlers[i](m)) return true;
		  }
		  return false;
		};
		
		var dataMsgHandler = function(m){
		  var i, len = dataHandlers? dataHandlers.length: 0;
		  for(i=0;i<len;i+=1){
		    if(dataHandlers[i](m)) return true;
		  }
		  return false;
		};
		
		var messages, data;
		if(this.debug) console.log("data in event: " + JSON.stringify(event));
		if(event.data){
		  messages = (SC.typeOf(event.data) === SC.T_STRING)? JSON.parse(event.data): event.data;
		  if(!messages) SC.Logger.log("ThothSC: Received information from the server that couldn't be parsed");
		  data = (messages instanceof Array)? messages: [messages]; // if messages is not an array, make one
		  data.forEach(function(m){
        SC.RunLoop.begin();
        m = (m instanceof Array)? m[0]: m;
		    if(!specialMsgHandler(m) && !dataMsgHandler(m)){
		      SC.Logger.log("ThothSC: received a message for which no handler has been registered.");
		      SC.Logger.log("ThothSC: Message is " + JSON.stringify(m));
		    }
		    SC.RunLoop.end();
		  });
		}
		else SC.Logger.log("Client received a malformed message!");
	}
  
});