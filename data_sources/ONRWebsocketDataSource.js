sc_require('data_sources/ONRDataSource');

ONR.ONRWebSocketDataSource = ONR.ONRDataSource.extend({
   
   ONRHost: 'localhost',
   
   ONRPort: '8080',
   
   ONRURL: '/socket.io/websocket',
   
   _webSocket: null, // the websocket object will be stored here
   
   connect: function(store,callback){ // we need the store to direct the push traffic to
      var wsURL = ['ws://',this.getConnectUrl()].join("");
      this._webSocket = new WebSocket(wsURL);
      // register callbacks
      this._webSocket.onopen = this.createOnOpenHandler(callback);
      this._webSocket.onmessage = this.createOnMessageHandler();
      this._webSocket.onerror = this.createOnErrorHandler();
      this._webSocket.onclose = this.createOnCloseHandler();
   },
   
   send: function(val){
      //console.log('Send function called on OrionNodeRiak Datasource');
      if(this._webSocket && val){
         var msg = JSON.stringify(val);
         console.log('Trying to send message: ' + msg);
         //return this._webSocket.send(msg);
         this._webSocket.send(msg); // cannot return anything as the calling function is most likely GC'ed already
      }
      else return false;
   }
   
});