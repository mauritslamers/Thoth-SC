/*globals ThothSC */

ThothSC.XHRPollingClient = ThothSC.BaseClient.extend({
  
  ThothAuthURL: '/auth',

	ThothURL: '/socket.io/xhr-polling',
  
  actualThothURL: function(){
		var pref = this.get('ThothURLPrefix'),
		url = this.get('ThothURL'),
		ret = pref? [pref,url].join(""): url;

		return ret;
	}.property('ThothURLPrefix','ThothURL').cacheable(),
	
	authURL: function(){
		var authurl = this.get('ThothAuthURL'),
		pref = this.get('ThothURLPrefix'),
		ret = pref? [pref,authurl].join(""): authurl;
		return ret;
	}.property('ThothAuthURL','ThothURLPrefix').cacheable(),
  
  connect: function(){
    if(!this.forceAuthentication) this.connectXHR();
    else {
      if(this.isAuthenticated) this.connectXHR();
    }
    this.isConnected = true;
  },
  
  _request: null,
  
  connectXHR: function(){
    var me = this, user, sessionKey;
    var isXHRPolling = true;
    if(this.forceAuthentication){
      if(!this.userData) return;
      user = this.userData.user(this.userData.key());
      sessionKey = this.userData.sessionKey(this.userData.key());
    }
    console.log('about to set up xhr polling...');
    this._request = SC.Request.getUrl(this.get('actualThothURL')).async()
		  .header('user',user)
		  .header('sessionkey',sessionKey)
		  .json()
		  .notify(me,'handleXHR',isXHRPolling).send(); 
  },
  
  handleXHR: function(response,isXHRPolling){
    var data;
    SC.RunLoop.begin();
    
    if(SC.ok(response)){
      data = response.get('body');
      if(data !== ""){
        if(data !== 'ok') this.messageHandler({ data: data });
      } 
      if(isXHRPolling) this._request.request.resend();
    }
  },
  
  send: function(data){
    SC.Logger.log("send function called with data: " + JSON.stringify(data));
		var dataToSend, user, sessionKey, me = this;
    if(data.auth){
      this.sendAuth(data);
    } 
    else {
      if(this.isConnected && !this._request) this.connectXHR();
      if(this.forceAuthentication && this.isAuthenticated){
        user = this.userData.user(this.userData.key());
        sessionKey = this.userData.sessionKey(this.userData.key());
      }
      dataToSend = 'data='+ encodeURIComponent(JSON.stringify(data));
      SC.Request.postUrl(this.get('actualThothURL'),dataToSend).async()
  		.header('user',user)
  		.header('sessionkey',sessionKey)
  		//.notify(me, 'handleXHR')
  		.send();
    }
  },
  
  sendAuth: function(data){
    var me = this, url = this.get('authURL');
    //this.isAuthenticating = true;
    //var baseReq = { user: data.auth.user, passwd: data.auth.passwd, application: this.getTopLevelName() };
    SC.Request.postUrl(url,data).json().notify(me,'handleXHR').send();
  }
  
  
  
  
  /*
  	var me = this;
		var url = this.get('authURL');
		//var baseRequest = {auth:{ user: user, passwd: passwd, passwdIsMD5: passwdIsMD5}};
		var baseRequest = { user: user, passwd: passwd, application: this.getTopLevelName() };
		SC.Logger.log("name of data source is: " + me.toString());
		this.user = user;
		if(this.userData && this.userData.isAuthenticated()) baseRequest.sessionKey = this.userData.sessionKey(this.userData.key()); // resume the session if possible
		console.log('sending auth request to ' + url);
		SC.Request.postUrl(url,baseRequest).json()
		.notify(me,'_authRequestCallback',me,user)
		.notify(500,me,'_authRequestSendError',me)
		.notify(404,this,'_authRequestSendError',me)
		.send();
		// it would be nice to add some extra notifications here, in case the server is down etc...
	},

	_authRequestSendError: function(){
		if(this.noConnectionCallback) this.noConnectionCallback();
		else this.showErrorMessage("No connection to the server",this.showLoginPane);
	},
   
	_authRequestCallback: function(response, dataSource,user){
		console.log('response from the auth request: ' + response);
		if (SC.ok(response)) {
			//var cookie = document.cookie;
			// this doesn't seem to work for some strange reason...
			var data = response.get('body');
			var sessionKey = data.sessionCookie;
			if(sessionKey){
				//console.log("sessionKey received");
				this.userData = ThothSC.userDataCreator({ user: user, sessionKey: sessionKey, role: data.role });
				this.isConnected = YES;
				this.isAuthenticated = YES;
				// now do the setup of the XHRPolling
				this.connectXHRPollingSC();
				// now do the authSuccessCallback
				if(this.authSuccessCallback){
					console.log('calling authSuccessCallback');
					this.authSuccessCallback({ role: data.role });   
				}
				else console.log('Thoth XHR Polling: no authSuccessCallback set');             
			}
			else {
				if(dataSource.authErrorCallback) dataSource.authErrorCallback(data.errorMessage);
				else this.showErrorMessage("Login failed", this.showLoginPane);
			} 
		}
		if(response.isError) console.log(response);//this.showErrorMessage(response,this.showLoginPane);
	},
  
  send: function(data){
		var user = this.userData? this.userData.user(this.userData.key()): '';
		var sessionKey = this.userData? this.userData.sessionKey(this.userData.key()): '';

		//console.log('ThothSC XHRPollingDataSource: trying to send: ' + JSON.stringify(data));
		var dataToSend = 'data='+ encodeURIComponent(JSON.stringify(data));
		SC.Request.postUrl(this.get('actualThothURL'),dataToSend).async()
		.header('user',user)
		.header('sessionkey',sessionKey)
		//.notify(500,this,'.showReconnectMessage',this)
		//.notify(404,this,'showReconnectMessage',this)
		.send();
	},
  
  
	_pollingRequest: null,

	connectXHRPollingSC: function(){
		console.log('XHRPollingDataSource: Setting up polling');
		console.log('XHRPollingDataSource: this = ' + this.toString());
		var me = this;
		var user = "", sessionKey = "";
		if(this.userData && this.userData.isAuthenticated()){
			user = this.userData.user(this.userData.key());
			sessionKey = this.userData.sessionKey(this.userData.key());
		}
		if(this._pollingRequest && !this._pollingRequest.shouldStopPolling){
			console.log('reusing polling');
			this._pollingRequest.resend();
		} 
		else {
			console.log('creating new polling req');
			this._pollingRequest = SC.Request.getUrl(this.get('actualThothURL')).async()
			.header('user',user)
			.header('sessionkey',sessionKey)
			.json()
			.notify(me,'handleXHRPolling',me);
			//.notify(400,me,'showReconnectMessage',me)
			//.notify(500,me,'showReconnectMessage',me);
			// in this way we can reuse the request itself, as send returns a response obj, not the request itself
			
			this._pollingRequest.send(); 
		}
	},

	shouldStopPolling: null, 
	
	handleXHRPolling: function(response,dataSource){
		// no runloop needed as this is taken care of in the main data source
		//if(response.request !== this._pollingRequest) return; // ignore "old" requests
		var me = this;
		SC.RunLoop.begin();
		if(SC.ok(response)){
			var dataHandler = dataSource.createOnMessageHandler();
			var data = response.get('body');
			//console.log('Type of data is: ' + SC.typeOf(data));
			if(data !== ""){
				var eventData = { data: data }; // overcome the event based dataHandler
				//console.log('sending eventdata to dataHandler: ' + SC.inspect(data[0]));
				dataHandler(eventData);            
			}
			if(!me.shouldStopPolling) me.invokeLater(me.connectXHRPollingSC);
			else {
				console.log('XHR Polling has stopped...');
				me.shouldStopPolling = null;
			}
		}
		//console.log('current status: ' + response.status);
		SC.RunLoop.end();
	},
  */
  
  
  // send: function(data){
  //  var user = this.userData? this.userData.user(this.userData.key()): '';
  //  var sessionKey = this.userData? this.userData.sessionKey(this.userData.key()): '';
  // 
  //  //console.log('ThothSC XHRPollingDataSource: trying to send: ' + JSON.stringify(data));
  //  var dataToSend = 'data='+ encodeURIComponent(JSON.stringify(data));
  //  SC.Request.postUrl(this.get('actualThothURL'),dataToSend).async()
  //  .header('user',user)
  //  .header('sessionkey',sessionKey)
  //  //.notify(500,this,'.showReconnectMessage',this)
  //  //.notify(404,this,'showReconnectMessage',this)
  //  .send();
  // },
  
  
  

  
  
});