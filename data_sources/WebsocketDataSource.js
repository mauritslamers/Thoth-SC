sc_require('data_sources/DataSource');

ThothSC.WebSocketDataSource = ThothSC.DataSource.extend({
   
   ThothURL: '/socket.io/websocket',
   
   shouldReconnect: YES,
   
   reconnectAttempts: 3,
   
   _webSocket: null, // the websocket object will be stored here
   
   connect: function(store,callback){ // we need the store to direct the push traffic to
      var wsURL = ['ws://',this.getConnectUrl()].join("");
      this._webSocket = new WebSocket(wsURL);
      // register callbacks
      this._webSocket.onopen = this.createOnOpenHandler(callback);
      this._webSocket.onmessage = this.createOnMessageHandler();
      this._webSocket.onerror = this.createOnErrorHandler();
      this._webSocket.onclose = this.createOnCloseHandler();
      this.store = store;
   },
   
   send: function(val){
      if(this._webSocket && val){
         var msg = JSON.stringify(val);
         console.log('Trying to send message: ' + msg);
         this._webSocket.send(msg); // cannot return anything as the calling function is most likely GC'ed already
      }
      else return false;
   },
   
   createOnCloseHandler: function(event){
      var me = this;
      var count = 0;
      return function(event){
         console.log('Websocket: MyonClose: ' + event.toString());
         // don't throw away existing user and session information
         me.isConnected = false;
         if(me.shouldReconnect){
           if(me.sendAuthRequest){
             console.log('WebSocket: trying to reconnect...');
             count += 1;
             if(count < me.reconnectAttempts){
               me.connect(null,function(){
                 // reauth using auth closure
                 me.sendAuthRequest();
               });               
             }
             else {
               console.log('WebSocket: failed to reconnect after ' + count + ' times. Reconnect by reloading the app?');
             }
           }
           else console.log('WS Connection closed, you need to reauth to continue...');
         } 
      };      
   }
   
});