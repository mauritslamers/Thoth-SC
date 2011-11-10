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
    SC.Logger.log("handlersDidChange called...");
    var h = this._handlers, i;
    if(!this._socket) return;
    for(i in h){
      if(h.hasOwnProperty(i)){
        this._socket.removeAllListeners(i);
        this._socket.on(i,h[i]);
      } 
    }
  },
  
  connect: function(){
    var me = this;
    var opts = {};
    var prefix = this.get('ThothURLPrefix');
    var url = 'http://' + this.get('host');
    if(!this.isConnected){
      SC.Logger.log("connecting using " + url + ' and prefix ' + prefix);
      if(prefix !== "") opts.resource = prefix + '/socket.io';
      this._socket = io.connect(url,opts);
      this._socket.on('connect', function(socket){
        me.didConnect.call(me);
      });
      this._socket.on('disconnect', function(socket){
        me.didDisconnect.call(me);
      });
    }
  },
  
  didConnect: function(){
    SC.Logger.log("connection successfull!");
    var me = this;
    var f = function(reauthIsValid){
      SC.Logger.log("Reauth request returned " + reauthIsValid);
      if(reauthIsValid){
        me._sendBuffer();
        me.appCallback(ThothSC.CONNECTION_OPENED);
      }
    }
    
    //this.isConnected = true;
    this.set('isConnected',true);
    if(this.forceAuthentication && this.userData){ // no userdata, no glory...
      SC.Logger.log("Trying to reauth...");
      ThothSC.sendReAuthRequest(f); // will re-authenticate if needed...
    }
    else {
      this._sendBuffer();
      this.appCallback(ThothSC.CONNECTION_OPENED);
    } 
  },
  
  didDisconnect: function(){
    this.appCallback(ThothSC.CONNECTION_CLOSED);
    this.set('isConnected',false);
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
    // always volatile to make sure the message is received in the end...
    var i;
    var ds = this.dataSource;
    var shouldLog = ds? ds.logTraffic: false;
    
    if(!this.get('isConnected')){
      SC.Logger.log("Trying to send data without connection, buffering...");
      this._buffer.pushObject(data);
      return;
    }
    for(i in data){
      if(data.hasOwnProperty(i)){
        if(shouldLog) SC.Logger.log("Sending message of type " + i + " and with data: " + SC.inspect(data[i]));
        this._socket.emit(i,data[i]);
      }
    }
  }
  
});