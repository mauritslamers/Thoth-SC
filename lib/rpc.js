/*globals ThothSC */

ThothSC.RPC = SC.Object.extend({
  
  init: function(){
    // if we are created we need to put up ourselves as handlers
    var me = this;
    var resultCb = function(m){
      this.onRPCResult(m);
    };
    
    var errorCb = function(m){      
      this.onRPCError(m);
    };
    
    ThothSC.client.on('rpcResult',resultCb,this);
    ThothSC.client.on('rpcError',errorCb,this);
  },
   
	_rpcRequestCache: null,

	rpcRequest: function(functionName,params,callback){
		// generate an RPC request to Thoth
		var cacheKey = ThothSC.createKey();
		if(!this._rpcRequestCache) this._rpcRequestCache = {};
		if(!this._rpcRequestCache[cacheKey]) this._rpcRequestCache[cacheKey] = { callback: callback };
		ThothSC.client.send( { rpcRequest: { functionName: functionName, params: params, returnData: { rpcCacheKey: cacheKey } }}); 
	},

	onRPCResult: function(rpcResult){
	  var cacheKey;
	  
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

	onRPCError: function(rpcError){
		if(!this._rpcRequestCache) throw "Thoth DataSource: received an RPC onRPC error but no request has been sent";
		else {
            if (rpcError) {
			  var cacheKey = rpcError.returnData.cacheKey;
			  this._rpcRequestCache[cacheKey].callback(rpcError);
            }
		}
	}
  
});
