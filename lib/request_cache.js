/*globals ThothSC*/

ThothSC.RequestCacheManager = SC.Object.extend({
  _requestCache: {},
  
  cacheKeySize: 32,
  
  _keySource: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  
  createCacheKey: function(){
     // the idea for this method was copied from the php site: 
     // http://www.php.net/manual/en/function.session-regenerate-id.php#60478
     var keyLength = this.get('cacheKeySize'),
         keySource = this._keySource,
         keySourceLength = keySource.length + 1, // we need to add one, to make sure the last character will be used in generating the key
         ret = [],
         curCharIndex;
     
     for(var i=0;i<=keyLength;i+=1){
        curCharIndex = Math.floor(Math.random()*keySourceLength);
        ret.push(keySource[curCharIndex]);
     }
     return ret.join('');
  },
  
  store: function(object){
    var key = this.createCacheKey();
    this._requestCache[key] = object;
    return key;
  },
  
  retrieve: function(key){
    return this._requestCache[key];
  },
  
  destroy: function(key){
    if(this._requestCache[key]) delete this._requestCache[key];
  }
});

ThothSC.requestCache = ThothSC.RequestCacheManager.create();