/*globals ThothSC */

ThothSC.RPC = SC.Object.extend({
  
  init: function(){
    // if we are created we need to put up ourselves as handlers
    var me = this;
    var resultCb = function(m){
      if(m.rpcResult){
        me.onRPCResult(m);
        return true;
      } 
    };
    
    var errorCb = function(m){
      if(m.rpcError){
        me.onRPCError(m);
        return true;
      } 
    };
    
    ThothSC.client.registerDataMessageHandler(resultCb);
    ThothSC.client.registerDataMessageHandler(errorCb);
  },
   
	_rpcRequestCache: null,

	rpcRequest: function(functionName,params,callback){
		// generate an RPC request to Thoth
		var cacheKey = ThothSC.createKey();
		if(!this._rpcRequestCache) this._rpcRequestCache = {};
		if(!this._rpcRequestCache[cacheKey]) this._rpcRequestCache[cacheKey] = { callback: callback };
		ThothSC.client.send( { rpcRequest: { functionName: functionName, params: params, returnData: { rpcCacheKey: cacheKey } }}); 
	},

	onRPCResult: function(data){
	  var rpcResult = data.rpcResult,
	      cacheKey;
	  
		if(!this._rpcRequestCache) throw "Thoth DataSource: received an RPC onRPC result but no request has been sent";
		else {	
			if(rpcResult){
				cacheKey = rpcResult.returnData.rpcCacheKey;
				if(!this._rpcRequestCache[cacheKey]){
				  SC.Logger.log("something fishy going on: cacheKey: " + cacheKey);
				  SC.Logger.log("This is "+ this);
				}
				this._rpcRequestCache[cacheKey].callback(rpcResult);
				delete this._rpcRequestCache[cacheKey]; // clean up
			}
			else throw "Thoth DataSource: received an invalid rpcResult message";
		}
	},

	onRPCError: function(data){
		if(!this._rpcRequestCache) throw "Thoth DataSource: received an RPC onRPC error but no request has been sent";
		else {
			var rpcError = data.rpcError;
			var cacheKey = rpcError.returnData.cacheKey;
			this._rpcRequestCache[cacheKey].callback(rpcError);
		}
	}
  
});