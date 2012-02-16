/*globals ThothSC*/

ThothSC.ModelCacheManager = SC.Object.extend({
  _modelCache: {},
  
  _modelGraphCache: {},
  
  store: function(model,shouldOverwrite){
    var graph, resource;
    
    if(!model || !model.prototype){
      throw new Error("You are trying to store an undefined model... this can cause problems!");
    } 

    resource = model.prototype.bucket || model.prototype.resource;        
    if(!this._modelCache[resource] || shouldOverwrite){
      graph = ThothSC.ModelGraphBuilder.create().set('content',model);
      this._modelGraphCache[resource] = graph;
      this._modelCache[resource] = model;      
    }
  },
  
  modelFor: function(resourceName){
    return this._modelCache[resourceName];
  },
  
  modelGraphFor: function(recType){
    var resource = (SC.typeOf(recType) === 'string')? recType: recType.prototype.bucket || recType.prototype.resource;
    return this._modelGraphCache[resource];
  },
  
  destroy: function(resourceName){
    if(this._cache[resourceName]) delete this._cache[resourceName];
  }
});

ThothSC.modelCache = ThothSC.ModelCacheManager.create();