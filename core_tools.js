/*globals ThothSC*/

SC.mixin(ThothSC,{
  
  getTopLevelName: function(object){ //to send the application name 
		var completeName = object.toString();
		if(completeName){
			return completeName.split(".")[0];
		}
		else return "";
	},
  
  connect: function(callback){ // callback can/will be called with (event, data)
    var func, toplevel;
    if(SC.typeOf(callback) !== 'string') throw new Error("connect needs a callback path");
     
    func = SC.objectForPropertyPath(callback);
    
    if(func){
      if(!this.client){ 
        toplevel = callback.substr(0,callback.indexOf("."));
        if(toplevel !== "") window[toplevel].store._getDataSource(); //init DS
      }
      this.client.appCallback = func;
      this.client.connect();
      return true;
    }
    else return false;
  },

	isXDomain: function(host){
		return host !== document.domain; 
	},
  
  recordTypeInQuery: function(query){
    var recType, bucket, msg;
    
    recType = query.get('recordType');
    if(recType){
      try {
        bucket = recType.prototype.bucket; 
      }
      catch(e) {
        msg = "ThothSC cannot retrieve the resource from the record model. ";
        msg += "This may be caused by an improper invocation of SC.Query.local().";
        var err = SC.Error.create({ message: msg });
        throw(err);
      }
    }
    return recType;
  },
  
  createKey: function(){
     // the idea for this method was copied from the php site: 
     // http://www.php.net/manual/en/function.session-regenerate-id.php#60478
     var keyLength = 32,
         keySource = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
         keySourceLength = keySource.length + 1, // we need to add one, to make sure the last character will be used in generating the key
         ret = [],
         curCharIndex;
     
     for(var i=0;i<=keyLength;i+=1){
        curCharIndex = Math.floor(Math.random()*keySourceLength);
        ret.push(keySource[curCharIndex]);
     }
     return ret.join('');
  },
  
  benchmark: function(func,context,times){
    var start = new Date().getTime(), end;
    var i;
    
    for(i=0;i<times;i+=1){
      if(func) func.call(context);
    }
    end = new Date().getTime();
    console.log('start time: ' + start);
    console.log('end time: ' + end);
    console.log('time difference: ' + (end - start));
  }
  

  
});