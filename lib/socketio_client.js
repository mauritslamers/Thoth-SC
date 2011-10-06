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
  
  _attachEvents: function(){
    var i, len;
    var specMesE = this._specialMessageEvents;
    var specMesH = this._specialMessageHandlers;
    var dataMesH = this._dataMessageHandlers;
    var dataMesE = this._dataMessageEvents;
    
    for(i=0,len=specMesE.length;i<len;i+=1){
      SC.Logger.log("registering spec handler for " + specMesE[i]);
      this._socket.on(specMesE[i],specMesH[i]);
    }
    for(i=0,len=dataMesH.length;i<len;i+=1){
      SC.Logger.log("registering data handler for " + dataMesE[i]);
      this._socket.on(dataMesE[i],dataMesH[i]);
    }
  },
  
  connect: function(){
    var me = this;
    var opts = {};
    //var url = 'http://' + this.get('connectUrl') + '/socket.io/';
    //var url = 'http://localhost:8000' + this.get('ThothURLPrefix') + "/socket.io/";
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
    //SC.Logger.log("connection successfull!");
    this.set('isConnected',true);
    this.appCallback(ThothSC.CONNECTION_OPENED);
    this._attachEvents();
    this._sendBuffer();
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
    
    if(!this.get('isConnected')){
      //SC.Logger.log("Trying to send data without connection, buffering...");
      this._buffer.pushObject(data);
      return;
    }
    for(i in data){
      if(data.hasOwnProperty(i)){
        this._socket.emit(i,data[i]);
      }
    }
  }
  
});