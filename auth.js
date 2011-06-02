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
    var cb = function(m){
      var sessionKey, role, ret;
      if(m.authSuccess){
        sessionKey = m.authSuccess.sessionKey;
        role = m.authSuccess.role;
        me.client.userData = ThothSC.userDataCreator({ user: user, sessionKey: sessionKey, role: role });
        ret = { authSuccess: {}};
        callback(ret);
        return true;
      }
      else if(m.authError){
        callback(m);
        return true;
      }
    };
    
    this.client.registerSpecialMessageHandler(cb);
    this.client.send({ auth: loginInfo});
  },
  
  logoutRequest: function(){
    /*
		if(m.logoutSuccess){
			me.onLogoutSuccess.call(me,m.logoutSuccess);
			return true; 
		}	*/

    
  },
  
  onLogoutSuccess: function(){
    this.userData = null;
		this.isLoggingOut = true;
		this.disconnect();
		if(this.logOutSuccessCallback) this.logOutSuccessCallback();
  }
  
  
  
});