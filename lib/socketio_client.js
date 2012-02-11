/*globals ThothSC io */

sc_require('socket.io');
// attempt to wrap the client side of socket.io for ThothSC

ThothSC.SocketIOClient = ThothSC.BaseClient.extend({
  
  host: function(){
	  var ds = this.dataSource;
		return ds.ThothPort? [ds.ThothHost,ds.ThothPort].join(":") : ds.ThothHost;
	}.property(),

	connectUrl: function(){
		var host = this.get('host'),
		    ds = this.dataSource,
		    pref = this.get('ThothURLPrefix'),
		    thothurl = this.ThothURL,
		    url = pref? [host,pref,thothurl].join(""): [host,thothurl].join("");
		return url;
	}.property(),
  
  _socket: null,
  
  _handlersDidChange: function(){
    //SC.Logger.log("handlersDidChange called...");
    var h = this._handlers, i;
    if(!this._socket) return;
    for(i in h){
      if(h.hasOwnProperty(i)){
        this._socket.removeAllListeners(i);
        this._socket.on(i,h[i]);
      } 
    }
  },
 
  _isConnecting: false,
  
  connect: function(){  
    if(this._isConnecting) return; // don't connect again when we are already connecting...
    this._isConnecting = true;
    var me = this;  
    var opts = {};
    // var opts = {
    //   'connect timeout': 1000
    // };  
    var prefix = this.get('ThothURLPrefix');
    var url = 'http://' + this.get('host');
    if(!this.isConnected){
      SC.Logger.log("connecting using " + url + ' and prefix ' + prefix);
      if(prefix !== "") opts.resource = prefix + '/socket.io';
      io.sockets = []; // workaround for bug in socket.io
      this._socket = io.connect(url,opts);
      this._socket.on('connect', function(socket){
        SC.RunLoop.begin();
        me.didConnect.call(me);
        SC.RunLoop.end();
      });
      this._socket.on('disconnect', function(socket){
        SC.RunLoop.begin();
        me.didDisconnect.call(me);
        SC.RunLoop.end();
      });
      this._socket.on("error", function(e){  
        SC.RunLoop.begin();
        me.onConnectionError.call(me);
        SC.RunLoop.end();
      });
    }
    else SC.Logger.log("not connecting because already connected..."); 
  },
  
  onConnectionError: function(){
    //SC.ExceptionHandler.handleException(SC.Error.create({ message: "A connection error has been detected. The application might not be able to connect to the server. Refresh the application is usually the best option."}));
    
    this._isConnecting = false;
    this.applicationCallback(ThothSC.CONNECTION_ERROR);
  },
  
  didConnect: function(){
    SC.Logger.log("connection successfull!");  
    var me = this;
    var f = function(reauthIsValid){
      SC.Logger.log("Reauth request returned " + reauthIsValid);
      if(reauthIsValid){
        me._sendBuffer();
        me.applicationCallback(ThothSC.CONNECTION_OPENED);
      }
      else me.applicationCallback(ThothSC.CONNECTION_REAUTHFAILED);
    };
    
    this.isConnected = true;  
    this._isConnecting = false;
    if(this.forceAuthentication && this.userData){ // no userdata, no glory...
      SC.Logger.log("Trying to reauth...");
      ThothSC.sendReAuthRequest(f); // will re-authenticate if needed...
    }
    else {
      this._sendBuffer();
      this.applicationCallback(ThothSC.CONNECTION_OPENED);
    } 
  },
  
  didDisconnect: function(){      
    console.log('socket lost connection... (ThothSC client)');
    var t = new Date();
    //this.set('isConnected',false);
    this.isConnected = false;
    this.applicationCallback(ThothSC.CONNECTION_CLOSED);
    this._disconnectedSince = t;
  },
  
  _buffer: [],
  
  _sendBuffer: function(){
    var me = this;
    var sender = function(obj,index,buf){
      //SC.Logger.log("sending object from buffer: " + SC.inspect(obj));
      me.send.call(me,obj);
      me._buffer.removeObject(obj);
    };
    if(this._buffer.length > 0){
      this._buffer.forEach(sender);
    }
  },
  
  send: function(data){
    // Thoth messages consists of an object with a command (event) and a body
    // so unwrap the message and emit it as an event
    var i;
    var ds = this.dataSource;
    var shouldLog = ds? ds.logTraffic: false;
    
    if(!this.get('isConnected')){
      SC.Logger.log("Trying to send data without connection, buffering...");
      this._buffer.pushObject(data); 
      if(!this.isConnecting) this.connect(); 
      return;
    }
    for(i in data){
      if(data.hasOwnProperty(i)){
        if(shouldLog){
          SC.Logger.log("Sending message of type " + i + " and with data: " + SC.inspect(data[i]));
          console.log(data[i]);
        } 
        this._socket.emit(i,data[i]);
      }
    }
  }
  
});