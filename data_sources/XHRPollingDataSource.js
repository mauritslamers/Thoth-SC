sc_require('data_sources/DataSource');
sc_require('system/XHRLongPollingRequest');

ThothSC.XHRPollingDataSource = ThothSC.DataSource.extend({

	ThothAuthURL: '/auth',

	ThothURL: '/socket.io/xhr-polling',

	authenticationPane: false,

	connect: function(store,callback){
		this.store = store;
		callback();
	},

	send: function(data){
		// check whether
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

	authURL: function(){
		var authurl = this.get('ThothAuthURL'),
		pref = this.get('ThothURLPrefix'),
		ret = pref? [pref,authurl].join(""): authurl;
		return ret;
	}.property('ThothAuthURL','ThothURLPrefix').cacheable(),

	authRequest: function(user,passwd,passwdIsMD5){
		// for XHRPolling an authRequest is a normal REST POST request
		var me = this;
		var url = this.get('authURL');
		//var baseRequest = {auth:{ user: user, passwd: passwd, passwdIsMD5: passwdIsMD5}};
		var baseRequest = { user: user, passwd: passwd };
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

	type: 'xhr-polling',
/*
	connect: function(store,callback){
		// setup the first connection and set the long polling action in motion
		// Thoth wants to do auth first, even if auth is not set up...
		// this way we can get a session key, so Thoth knows who we are...

		this.store = store;
		// set up the first connection
		if(!callback && this.authenticationPane){
			// if no callback, show the authentication Pane
			this.showLoginPane();
		}
		else {
			// do the callback
			if(callback) callback();
		}
	}, */

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

	showReconnectMessage: function(msg){
		var me = this;
		if(!this.noConnectionCallback){
			var sheet = SC.SheetPane.create({
				layout: { width:350, height: 150, centerX: 0 },
				contentView: SC.View.extend({
					layout: { top: 0, right: 0, bottom: 0, left: 0 },
					childViews: "questionLabel reconnectButton loginButton".w(),

					questionLabel: SC.LabelView.design({
						layout: { top: 30, height: 75, width: 300, centerX: 0 },
						textAlign: SC.ALIGN_CENTER,
						value: msg? msg: 'The link with the server has been disconnected.'
					}),

					reconnectButton: SC.ButtonView.design({
						layout: { bottom: 20, height: 25, width: 100, centerX: -60 },
						title: 'Reconnect',
						isDefault: YES,
						action: 'onReconnectReconnect',
						target: me
					}),

					loginButton: SC.ButtonView.design({
						layout: { bottom: 20, height: 25, width: 100, centerX: 60 },
						title: 'Login',
						isDefault: NO,
						action: 'onReconnectLogin',
						target: me
					})
				})
			});
			this._pane = sheet;
			sheet.append();				
		}
		else {
			this.noConnectionCallback();
		}
	},

	onReconnectReconnect: function(){
		// ok button called, remove pane and try to reconnect
		this._pane.remove();
		this._pane = null;
		this.connectXHRPollingSC();
	},

	onReconnectLogin: function(){
		this._pane.remove();
		this._pane = null;
		this.showLoginPane();      
	},
	
	disconnect: function(){
		//function to disconnect the XHR polling after logout
		console.log("XHRPolling disconnecting...");
		this.shouldStopPolling = YES;
		//SC.Request.manager.cancel(this._pollingRequest);
		//this._pollingRequest.destroy();
	}

});

