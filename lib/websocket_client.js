/*globals ThothSC WebSocket*/

ThothSC.WebSocketClient = ThothSC.BaseClient.extend({
  
  ThothURL: '/socket.io/websocket',
  
  dataSource: null,
  
  _reconnectCount: null,
  
  _webSocket: null,
  
	getHost: function(){
	  var ds = this.dataSource;
		return ds.ThothPort? [ds.ThothHost,ds.ThothPort].join(":") : ds.ThothHost;
	},

	getConnectUrl: function(){
		var host = this.getHost(),
		    ds = this.dataSource,
		    pref = ds.ThothURLPrefix,
		thothurl = this.ThothURL,
		url = pref? [host,pref,thothurl].join(""): [host,thothurl].join("");
		return url;
	},

	actualThothURL: function(){
	  var ds = this.dataSource;
		var pref = ds.get('ThothURLPrefix'),
		url = this.get('ThothURL'),
		ret = pref? [pref,url].join(""): url;

		return ret;
	}.property('ThothURLPrefix','ThothURL').cacheable(),
  
  connect: function(){
    var wsURL = ['ws://',this.getConnectUrl()].join("");
		// register callbacks
		var me = this;
		var cb = function(e){
		  return function(){
		    if(me.appCallback) me.appCallback(e,arguments);
		  };
		};
		var onOpened = function(){
		  var callb = cb(ThothSC.CONNECTION_OPENED);
		  me.isConnected = true;
		  if(me._sendQueue.length > 0){
		    me._sendQueue.forEach(function(val){
		      me.send(val);
		    });
		  }
      callb();
		};
		
		var onClosed = function(){
		  // try to reconnect
		  var callb = cb(ThothSC.CONNECTION_CLOSED);
		  me.isConnected = false;
		  if(me._reconnectCount < 3){
		    me._reconnectCount += 1;
		    me.connect();
		  }
		  else {
		    me._reconnectCount = 0;
		    callb();
		  } 
		};
		
		var msgHandler = function(data){
		  me.messageHandler.call(me,data);
		};
		
		if(this.debug) SC.Logger.log("connecting to ws with url: " + wsURL);
		this._webSocket = new WebSocket(wsURL);
		this._webSocket.onopen = onOpened;
		this._webSocket.onmessage = msgHandler;
		this._webSocket.onerror = cb(ThothSC.CONNECTION_ERROR);
		this._webSocket.onclose = onClosed;
  },
  
  _sendQueue: [],
  
 	send: function(val){
 	  var ws = this._webSocket;
 	  var msg;
 	  if(!this.isConnected){
 	    SC.Logger.log("ThothSC is not connected, queuing request...");
 	    SC.Logger.log("Did you perhaps forget to call connect in your state chart or app startup?");
 	    this._sendQueue.push(val);
 	  }
 	  
 	  //MYWS = ws;
		if(ws && val && this.isConnected){
			this._reconnectCount = 0; // reset the counter when being able to send something
			msg = JSON.stringify(val);
			if(this.debug) SC.Logger.log("Trying to send message: " + msg);
			ws.send(msg); // cannot return anything as the calling function is most likely GC'ed already
		}
		else return false;
	}
	
	/*
	createOnCloseHandler: function(event){
		var me = this;
		return function(event){
			console.log('Websocket: MyonClose: ' + event.toString());
			// don't throw away existing user and session information
			me.isConnected = false;
			if(me.shouldReconnect){
				if(me.sendAuthRequest && !me.isLoggingOut){
					console.log('WebSocket: trying to reconnect...');
					me._reconnectCount += 1;
					if(me._reconnectCount < me.reconnectAttempts){
						me.connect(null,function(){
							// reauth using auth closure
							me.sendAuthRequest();
						});               
					}
					else {
						console.log('WebSocket: failed to reconnect after ' + me._reconnectCount + ' times. Reconnect by reloading the app?');
					}
				}
				else {
					
					console.log('WS Connection closed, you need to reauth to continue...');
				} 
			}
			me.isLoggingOut = null; 
		};      
	} */
  
});