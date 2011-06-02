/*globals ThothSC*/

// basic data source for ThothSC


ThothSC.DataSource = SC.DataSource.extend({
  
  connectUsing: null, // define traffic specification
  
  combineReturnCalls: null, // if you set this to true, thoth will send back all data in one response, instead of in a few.
  
  useRPC: null, // set to true if you want RPC support
  
  useAuthentication: true, // set to false if you don't want to use authentication
  
  //settings about which parts of the model graph to send to Thoth
  sendRelations: null,
  
  sendProperties: null, 
  
  sendComputedProperties: null,
  
  // INTERNAL
  
  _store: null,
  
  init: function(){
    sc_super();
    switch(this.connectUsing){
      case ThothSC.WEBSOCKET: ThothSC.client = ThothSC.WebSocketClient.create(); break;
      case ThothSC.XHRPOLLING: ThothSC.client = ThothSC.XHRPollingClient.create(); break;
      default: throw new Error("ThothSC init without a traffic specification!");
    }
    ThothSC.client.dataSource = this; // hook up ourselves in the client
    // hook up data message callbacks
    this.registerDataCallbacks();
    
    if(!ThothSC.requestCache) ThothSC.requestCache = ThothSC.RequestCacheManager.create(); // fallback
    if(!ThothSC.modelCache) ThothSC.modelCache = ThothSC.ModelCacheManager.create();
  },
  
  messages: [
    ['createRecord', 'onPushedCreateRecord'],
    ['updateRecord', 'onPushedUpdateRecord'],
    ['deleteRecord', 'onPushedDeleteRecord'],
    ['fetchResult', 'onFetchResult'],
    ['createRecordResult', 'onCreateRecordResult'],
    ['updateRecordResult', 'onUpdateRecordResult'],
    ['deleteRecordResult', 'onDeleteRecordResult'],
    ['refreshRecordResult', 'onRefreshRecordResult'],
    ['fetchError', 'onFetchError'],
    ['refreshRecordError', 'onRefreshRecordError'],
    ['createRecordError', 'onCreateRecordError'],
    ['updateRecordError', 'onUpdateRecordError'],
    ['deleteRecordError', 'onDeleteRecordError']
  ],
  
  registerDataCallbacks: function(){
    var client = ThothSC.client,
        msgs = this.messages,
        i,len = msgs.length, me = this;
    var cbCreator = function(type,fn){
      return function(msg){
        if(msg[type]){ 
          me[fn](msg);
          return true;
        }
      };
    };
    
    for(i=0;i<len;i+=1){
      client.registerDataMessageHandler(cbCreator(msgs[i][0],msgs[i][1]));
    }
  },
  
  //CRUD operations

  createBaseRequest: function(recType){
    var modelGraph, cps, rels, ret;
    
    ThothSC.modelCache.store(recType);
    modelGraph = ThothSC.modelCache.modelGraphFor(recType);
    cps = modelGraph.get('computedProperties');
    rels = modelGraph.get('relations');
    ret = {
      bucket: modelGraph.get('resource'),
      primaryKey: modelGraph.get('primaryKey'),
      application: ThothSC.getTopLevelName(this),
      properties: this.sendProperties? modelGraph.get('properties'): undefined,
      computedProperties: (this.sendComputedProperties && (cps.length > 0))? cps: undefined,
      relations: (this.sendRelations && (rels.length>0))? rels: undefined,
      combineReturnCalls: this.combineReturnCalls || undefined
    };    
    return ret;
  },
  
  createFetchRequest: function(recType,query){
    var baseReq = this.createBaseRequest(recType);
    var ret;
    if(query.conditions){ // if there are conditions, add to the request
       baseReq.conditions = query.conditions;
       baseReq.parameters = query.parameters;
    }
    return { fetch: baseReq };
  },
  
  getNumberOfResponses: function(baseRequest){
    var ret = 1;
    if(!this.combineReturnCalls){
      ret += baseRequest.relations.length;
    }
    return ret;
  },
  
  fetch: function(store,query){      
    var rectype, numResponses, request, requestKey, resource;

    if(!this._store) this._store = store; // keep a reference to the store for push purposes
    if(!ThothSC.client.isConnected) return false; // prevent sending anything if not ready
    
    //console.log('Thoth DataSource: fetch called!');
    rectype = ThothSC.recordTypeInQuery(query);
    if(rectype && query.isRemote()){
      request = this.createFetchRequest(rectype,query);      
      numResponses = this.getNumberOfResponses(request);
      requestKey = ThothSC.requestCache.store({ store: store, query: query, numResponses: numResponses });
      request.fetch.returnData = { requestKey: requestKey };
      if(this.debug) console.log('Sending fetchRequest: ' + JSON.stringify(request));
      ThothSC.client.send(request);      
      return true;
    }
    return false;
  },
  
  
  updateStoreOnFetch: function(requestKey, records, isComplete){
    var requestCache = ThothSC.requestCache.retrieve(requestKey);
    var c_storeKeys = {}, c_recordKeys = {};
    var recType = ThothSC.recordTypeInQuery(requestCache.query);
    var store = requestCache.store, noStoreKey, curPrimKeyValue;
    var storeKeys = [], storeKey;
    var primKey = recType.prototype.primaryKey;
    
    records.forEach(function(rec,i){
      storeKey = ThothSC.loadRecord(store,recType,noStoreKey,rec,isComplete);
      storeKeys.push(storeKey);
      c_storeKeys[storeKey] = i;
      curPrimKeyValue = rec[primKey] || rec.key || rec.id || rec.guid;
      c_recordKeys[curPrimKeyValue] = i;
    });
    
    if(!isComplete){
      requestCache.storeKeys = c_storeKeys;
      requestCache.recordKeys = c_recordKeys;
      requestCache.records = records;
    }
    // rather not use refreshQuery, as that sends us in an endless loop
    var recArray = store._findQuery(requestCache.query, YES, NO);
    if (recArray) recArray.set('storeKeys', storeKeys);
  },
  
  // This works as follows: 
  // step 1:  if the fetchresult contains a relation set and no records have been received yet (no storeKeys),
  //          the relations are stored in the requestCache
  // step 2:  if there are no storeKeys in the cache and the fetchResult contains records, check if there are 
  //          relations and merge them with the records, else take the records from the fetch result, and 
  //          update the store
  // step 3:  if there are storeKeys in the cache and we have a relationSet, merge.
  // step 4:  if this request was the last one, finish off
  onFetchResult: function(data){
    var fetchResult = data.fetchResult;
    var requestCache, records;
    var requestKey = fetchResult.returnData.requestKey;
    
    if(fetchResult){
      requestCache = ThothSC.requestCache.retrieve(requestKey);
      if(!requestCache) return;
      if(fetchResult.relationSet && !requestCache.storeKeys){
        if(!requestCache.unsavedRelations) requestCache.unsavedRelations = fetchResult.relationSet;
        else requestCache.unsavedRelations.pushObjects(fetchResult.relationSet);
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }
      if(!requestCache.storeKeys && fetchResult.records){
        if(requestCache.unsavedRelations){
          records = ThothSC.mergeRelationSet(requestCache.recordType,fetchResult.records,requestCache.unsavedRelations);
          delete requestCache.unsavedRelations;
        }
        else records = fetchResult.records;
        this.updateStoreOnFetch(requestKey,records,(requestCache.numResponses < 2));
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }
      if(requestCache.storeKeys && fetchResult.relationSet){
        records = ThothSC.mergeRelationSet(requestCache.recordType,requestCache.records,(requestCache.numResponses < 2));
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }
      if((this.combinedReturnCalls && requestCache.numResponses === 1) ||
            (!this.combinedReturnCalls && requestCache.numResponses === 0)){
        if(this.debug) console.log('ThothSC: finishing off Fetch request');
        requestCache.store.dataSourceDidFetchQuery(requestCache.query);
        ThothSC.requestCache.destroy(requestKey);
      }    
    }
  },
  
  onFetchError: function(data){
    //function to handle Thoth error messages for fetch
    var fetchError = data.fetchError,
        errorCode, requestCacheKey, requestCache, message,
        query, store;

    if(fetchError){
      errorCode = fetchError.errorCode;
      requestCacheKey = fetchError.returnData.requestCacheKey;
      requestCache = ThothSC.requestCache.retrieve(requestCacheKey);
      switch(errorCode){
        case 0: message = "The policy settings on the server don't allow you to fetch these records"; break;
      }
      requestCache.store.dataSourceDidErrorQuery(requestCache.query);
      ThothSC.requestCache.destroy(requestCacheKey);
      ThothSC.client.appCallback(ThothSC.DS_ERROR);
    }
  },
  
  retrieveRecord: function(store,storeKey,id){
    var recType = store.recordTypeFor(storeKey);
    var baseReq = this.createBaseRequest(recType);
    var cacheObj = { 
      store: store, 
      recordType: recType, 
      storeKey: storeKey,
      id: id? id: store.idFor(storeKey),
      numResponses: this.getNumberOfResponses(baseReq)
    };
    var requestKey = ThothSC.requestCache.store(cacheObj);
    baseReq.returnData = { requestCacheKey: requestKey };
    ThothSC.send({ refreshRecord: baseReq });
    return true;
  },
  
  // this is mainly the same setup as with onFetchResult, only with a single record and no dataSourceDidComplete
  // as ThothSC.loadRecord will take care of the needed actions.
  onRefreshRecordResult: function(data){
    var refreshResult = data.refreshResult;
    var requestKey = refreshResult.returnData.requestCacheKey;
    var reqC = ThothSC.requestCache.retrieve(requestKey);
    var mergedData;
    
    if(!reqC) return;
    if(!reqC.record && refreshResult.relationSet){
      if(!reqC.unsavedRelations) reqC.unsavedRelations = refreshResult.relationSet;
      else reqC.unsavedRelations.pushObjects(refreshResult.relationSet);
      if(!this.combinedReturnCalls) reqC.numResponses -= 1;
    }
    if(refreshResult.record){
      if(reqC.unsavedRelations) mergedData = ThothSC.mergeRelationSet(reqC.recordType,[refreshResult.record],reqC.unsavedRelations)[0];
      else mergedData = refreshResult.record;
      reqC.record = mergedData;
      ThothSC.loadRecord(reqC.store,reqC.recordType,reqC.storeKey,mergedData,(reqC.numResponses < 2));
      if(!this.combinedReturnCalls) reqC.numResponses -=1;
    }
    if(reqC.record && refreshResult.relationSet){
      mergedData = ThothSC.mergeRelationSet(reqC.recordType,[reqC.record],refreshResult.relationSet)[0];
      ThothSC.loadRecord(reqC.store,reqC.recordType,reqC.storeKey,mergedData,(reqC.numResponses < 2));
      if(!this.combinedReturnCalls) reqC.numResponses -= 1;
    }
    if((this.combinedReturnCalls && reqC.numResponses === 1) || (!this.combinedReturnCalls && reqC.numResponses === 0)){
      if(this.debug) console.log('ThothSC: finishing off refresh request');
      ThothSC.requestCache.destroy(requestKey);
    }  
  },

  onRefreshRecordError: function(data){
    //function to handle Thoth error messages for fetch
    var refreshRecordError = data.refreshRecordError,
        errorCode, requestCacheKey, curRequestData, message,
        storeKey, store;

    if(refreshRecordError){
      errorCode = refreshRecordError.errorCode;
      requestCacheKey = refreshRecordError.returnData.requestCacheKey;
      curRequestData = ThothSC.requestCache.retrieve(requestCacheKey);
      switch(errorCode){
        case 0: message = "The policy settings on the server don't allow you to refresh this record"; break;
      }
      storeKey = curRequestData.storeKey;
      store = curRequestData.store;
      store.dataSourceDidError(storeKey);
      ThothSC.requestCache.destroy(requestCacheKey);
      ThothSC.client.appCallback(ThothSC.DS_ERROR, message);
    }
  }
  

  
  
  
});