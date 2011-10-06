/*globals ThothSC*/

sc_require('core');

SC.mixin(ThothSC,{
  
  sendAuthRequest: function(user,password,opts,callback){
    var loginInfo, appName;
    var me = this;
    if(!callback && opts && (SC.typeOf(opts) === 'function')){
      callback = opts;
      opts = null;
    } 
    
    loginInfo = {
      user: user,
      passwd: password
    };
    if(opts && opts.encryption){
      switch(opts.encryption){
        case ThothSC.MD5: password = ThothSC.CryptoMD5.hex(password); break;
        case ThothSC.RIPEMD160: password = ThothSC.CryptoRIPEMD.hex(password); break;
        case ThothSC.SHA1: password = ThothSC.CryptoSHA1.hex(password); break;
        case ThothSC.SHA256: password = ThothSC.CryptoSHA256.hex(password); break;
        case ThothSC.SHA512: password = ThothSC.CryptoSHA512.hex(password); break;
      }
      loginInfo.password = password;
      loginInfo.encryption = opts.encryption;
    }
    
    if(this.client){
      loginInfo.application = this.getTopLevelName(this.client.dataSource);
    }
    
    // register authentication special message functions
    this.client.on('authSuccess', function(data){
      var sK = data.sessionKey,
          role = data.role;
          
      me.client.userData = ThothSC.userDataCreator({ user: user, sessionKey: sK, role: role });
      me.client.isAuthenticated = true;
      var ret = { authSuccess: {} };
      callback(ret);
    },this);
    
    this.client.on('authError', function(data){
      callback(data);
    },this);
    
    this.client.on('authFailure', function(data){
      callback(data);
    },this);
    
    this.client.send({ auth: loginInfo });
  },
  
  sendLogoutRequest: function(){
    var userData = this.client.userData;
    if(userData){
      this.client.send({ logOut: { user: userData.user(userData.key()), sessionKey: userData.sessionKey(userData.key())}});      
    }
  },
  
  onLogoutSuccess: function(){
    this.userData = null;
		this.isLoggingOut = true;
		this.disconnect();
		if(this.logOutSuccessCallback) this.logOutSuccessCallback();
  }
  
  
  
});