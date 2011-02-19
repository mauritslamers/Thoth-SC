// functions that act as a toolbox for ThothSC

SC.mixin(ThothSC, {
  
  createRequestCacheKey: function(){
     // the idea for this method was copied from the php site: 
     // http://www.php.net/manual/en/function.session-regenerate-id.php#60478
     var keyLength = 32,
         keySource = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
         keySourceLength = keySource.length + 1, // we need to add one, to make sure the last character will be used in generating the key
         ret = [],
         curCharIndex = 0;
     
     for(var i=0;i<=keyLength;i++){
        curCharIndex = Math.floor(Math.random()*keySourceLength);
        ret.push(keySource[curCharIndex]);
     }
     return ret.join('');
  },
  
  userDataCreator: function(userdata){
    var closureKey = ThothSC.createRequestCacheKey(), 
        value = userdata;  

    return SC.Object.create({
      key: function(){
        //for now just return the key, but we can implement extra security stuff here
        return closureKey;
      },

      user: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.user;
        } 
      },

      sessionKey: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.sessionKey;
        }
      },

      role: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.role;
        } 
      },
      
      isAuthenticated: function(){
        if(value.user && value.sessionKey) return YES;
        else return NO;
      }
    });

  }
  
});