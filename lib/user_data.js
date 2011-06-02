/*globals ThothSC*/

ThothSC.userDataCreator = function(userdata){
  var closureKey = ThothSC.createKey();
  var value = userdata;
  var propertyGetter = function(propName){
        return function(key){
          if(key === closureKey){
            closureKey = ThothSC.createKey();
            return value[propName];
          }
        };
      };

  return SC.Object.create({
    key: function(){
      //for now just return the key, but we can implement extra security stuff here
      return closureKey;
    },
    
    user: propertyGetter('user'),
    sessionKey: propertyGetter('sessionKey'),
    role: propertyGetter('role'),
    
    isAuthenticated: function(){
      if(value.user && value.sessionKey) return YES;
      else return NO;
    }.property()
  });

};