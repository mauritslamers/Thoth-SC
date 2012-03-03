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
  
  connectUsing: ThothSC.SOCKETIO,
  
  useSSL: false, // when using ssl, set this to true
  
  logTraffic: false, // send the messages sent to the server to the console too
  
  defaultResponder: null, // default responder for events, can be used for state charts
  
  // INTERNAL
  
  _store: null,
  
  init: function(){
    arguments.callee.base.apply(this, arguments);
    switch(this.connectUsing){
      case ThothSC.SOCKETIO: ThothSC.client = ThothSC.SocketIOClient.create(); break; 
      case ThothSC.FAKE: ThothSC.client = ThothSC.FakeClient.create(); break;
      default: throw new Error("ThothSC init without a traffic specification!");
    }
    ThothSC.client.dataSource = this; // hook up ourselves in the client
    // hook up data message callbacks
    this.registerDataCallbacks();
    
    if(!ThothSC.requestCache) ThothSC.requestCache = ThothSC.RequestCacheManager.create(); // fallback
    if(!ThothSC.modelCache) ThothSC.modelCache = ThothSC.ModelCacheManager.create();
    if(this.defaultResponder) ThothSC.defaultResponder = this.defaultResponder;
  },
  
  messages: [
    [ThothSC.ACTION_CREATE, 'onPushedCreateRecord'],
    [ThothSC.ACTION_UPDATE, 'onPushedUpdateRecord'],
    [ThothSC.ACTION_DELETE, 'onPushedDeleteRecord'],
    //[ThothSC.ACTION_FETCH_REPLY, 'onFetchResult'],
    [ThothSC.ACTION_FETCH_REPLY, 'onFetchReply'],
    [ThothSC.ACTION_FETCH_RELATION_REPLY, 'onFetchRelationReply'],
    [ThothSC.ACTION_CREATE_REPLY, 'onCreateRecordResult'],
    [ThothSC.ACTION_UPDATE_REPLY, 'onUpdateRecordResult'],
    [ThothSC.ACTION_DELETE_REPLY, 'onDeleteRecordResult'],
    //[ThothSC.ACTION_REFRESH_REPLY, 'onRefreshRecordResult'],
    [ThothSC.ACTION_REFRESH_REPLY, 'onRefreshReply'],    
    [ThothSC.ACTION_REFRESH_RELATION_REPLY, 'onRefreshRelationReply'],
    //[ThothSC.ACTION_REFRESH_RELATION_REPLY, 'onRefreshRecordResult'],    
    [ThothSC.ACTION_FETCH_ERROR, 'onFetchError'],
    [ThothSC.ACTION_REFRESH_ERROR, 'onRefreshRecordError'],
    [ThothSC.ACTION_CREATE_ERROR, 'onCreateRecordError'],
    [ThothSC.ACTION_UPDATE_ERROR, 'onUpdateRecordError'],
    [ThothSC.ACTION_DELETE_ERROR, 'onDeleteRecordError']
  ],
  
  registerDataCallbacks: function(){
    var client = ThothSC.client,
        msgs = this.messages,
        i,len = msgs.length, me = this;
    var cbCreator = function(fn){
      return function(msg){ me[fn](msg); }; 
    };
    
    for(i=0;i<len;i+=1){
      client.on(msgs[i][0],cbCreator(msgs[i][1]),me);
    }
  },
  
  //CRUD operations
  // create a base request. 
  //If record is supplied, primaryKey name and primaryKey value are put on the request
  //and relations are stripped and keys added to the request
  //if primaryKey is supplied, it will override the value of the key on the record
  createBaseRequest: function(recType,record, primaryKey){
    var modelGraph, cps, rels, ret, primKey, rec;
    
    if(record) rec = SC.copy(record);
    ThothSC.modelCache.store(recType);
    modelGraph = ThothSC.modelCache.modelGraphFor(recType);
    cps = modelGraph.get('computedProperties');
    rels = modelGraph.relationsFor(record);
    primKey = modelGraph.get('primaryKey');
    ret = {
      bucket: modelGraph.get('resource'),
      primaryKey: primKey,
      key: rec? primaryKey || rec[primKey] : undefined,
      _revision: rec? rec['_revision']: undefined,
      application: ThothSC.getTopLevelName(this),
      properties: this.sendProperties? modelGraph.get('properties'): undefined,
      computedProperties: (this.sendComputedProperties && (cps.length > 0))? cps: undefined,
      relations: (this.sendRelations && (rels.length>0))? rels: undefined,
      combineReturnCalls: this.combineReturnCalls || undefined,
      record: rec
    };
    if(primaryKey && (!ret.record[primKey] || ret.record[primKey] !== primaryKey)){
      ret.record[primKey] = primaryKey; // add primary key to hash 
    }
    return ThothSC.stripRelations(ret);
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
  
  getNumberOfResponses: function(request,action){
    var ret = 1;
    var baseRequest = request.fetch || request; 
    
    var isRetrievable = function(rel){
      if(rel.isNested) return false;
      if(rel.isDirectRelation && rel.isMaster && !rel.isChildRecord) return false;
      return true;
    };
    
    if(!this.combineReturnCalls && baseRequest.relations){
      baseRequest.relations.forEach(function(r){
        switch(action){
          case ThothSC.ACTION_FETCH: 
              if(isRetrievable(r)) ret += 1; 
              break;
          case ThothSC.ACTION_REFRESH: 
            if(isRetrievable(r)) ret += 1; 
            break; // for now only fetch and refresh
        }
      });
      //ret += baseRequest.relations.length;
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
      numResponses = this.getNumberOfResponses(request,ThothSC.ACTION_FETCH);
      SC.Logger.log("Expecting " + numResponses + " responses");
      requestKey = ThothSC.requestCache.store({ store: store, query: query, numResponses: numResponses, recordType: rectype });
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
  
  
  onFetchReply: function(fetchReply){
    var reqCache, records,
        reqKey = fetchReply.returnData.requestKey;

    if(!fetchReply) return;
    reqCache = ThothSC.requestCache.retrieve(reqKey);
    if(!reqCache){
      if(this.debug) SC.Logger.log("ThothSC Datasource... receiving a fetch request without a request cache?? This must be a bug!");
      return;
    }
    if(fetchReply.records){
      if(reqCache.unsavedRelations){ // if unsaved relations, first merge
        records = ThothSC.mergeRelationSet(reqCache.recordType,fetchReply.records,reqCache.unsavedRelations);
        delete reqCache.unsavedRelations;
      }
      else records = fetchReply.records;
      this.updateStoreOnFetch(reqKey,records,(reqCache.numResponses < 2));
      if(!this.combinedReturnCalls) reqCache.numResponses -= 1;
    }
    this._finishFetch(reqKey,reqCache);   

  },
  
  onFetchRelationReply: function(relReply){
    var reqKey = relReply.returnData.requestKey;
    var reqCache,records;
    
    if(!(relReply && relReply.relationSet)) return;
    
    reqCache = ThothSC.requestCache.retrieve(reqKey);
    if(!reqCache){
      if(this.debug) SC.Logger.log("ThothSC Datasource... receiving a fetch relation request without a request cache?? This must be a bug!");
      return;
    }
    if(!reqCache.storeKeys){
      if(!reqCache.unsavedRelations) reqCache.unsavedRelations = relReply.relationSet;
      else reqCache.unsavedRelations.pushObjects(relReply.relationSet);
      if(!this.combinedReturnCalls) reqCache.numResponses -= 1;
    }
    else {
      records = ThothSC.mergeRelationSet(reqCache.recordType,reqCache.records,relReply.relationSet);
      this.updateStoreOnFetch(reqKey,records,(reqCache.numResponses < 2));
      if(!this.combinedReturnCalls) reqCache.numResponses -= 1;        
    }
    this._finishFetch(reqKey,reqCache); 
  },
  
  _finishFetch: function(requestKey,requestCache){
    if((this.combinedReturnCalls && requestCache.numResponses === 1) || 
        (!this.combinedReturnCalls && requestCache.numResponses === 0)){
      if(requestCache.query) {
        requestCache.store.dataSourceDidFetchQuery(requestCache.query);
      }
      else SC.Logger.log("a fetch without a query?...");
      ThothSC.requestCache.destroy(requestKey);
      if(this.debug) console.log('ThothSC: finished Fetch request');
    }
  },
  
  // This works as follows: 
  // step 1:  if the fetchresult contains a relation set and no records have been received yet (no storeKeys),
  //          the relations are stored in the requestCache
  // step 2:  if the fetchResult contains records, check if there are relations and merge them with the records, 
  //          else take the records from the fetch result, and update the store. 
  // step 3:  if there are storeKeys in the cache and we have a relationSet, merge.
  // step 4:  if this request was the last one, finish off
  onFetchResult: function(fetchResult){
    var requestCache, records;
    var requestKey = fetchResult.returnData.requestKey;
    
    SC.Logger.log("fetchResult received for: " + requestKey);
    
    if(fetchResult){
      requestCache = ThothSC.requestCache.retrieve(requestKey);
      if(!requestCache){
        SC.Logger.log("ThothSC Datasource... receiving a fetch request without a request cache?? This must be a bug!");
        return;
      } 
      if(fetchResult.relationSet && !requestCache.storeKeys){
        if(!requestCache.unsavedRelations) requestCache.unsavedRelations = fetchResult.relationSet;
        else requestCache.unsavedRelations.pushObjects(fetchResult.relationSet);
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }  
      //if(!requestCache.storeKeys && fetchResult.records){
      if(fetchResult.records){
        if(requestCache.unsavedRelations){
          records = ThothSC.mergeRelationSet(requestCache.recordType,fetchResult.records,requestCache.unsavedRelations);
          delete requestCache.unsavedRelations;
        }
        else records = fetchResult.records;
        this.updateStoreOnFetch(requestKey,records,(requestCache.numResponses < 2));
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }
      if(requestCache.storeKeys && fetchResult.relationSet){
        records = ThothSC.mergeRelationSet(requestCache.recordType,requestCache.records,fetchResult.relationSet);
        this.updateStoreOnFetch(requestKey,records,(requestCache.numResponses < 2));
        if(!this.combinedReturnCalls) requestCache.numResponses -= 1;
      }
      if((this.combinedReturnCalls && requestCache.numResponses === 1) ||
            (!this.combinedReturnCalls && requestCache.numResponses === 0)){
        if(this.debug) console.log('ThothSC: finishing off Fetch request');
        if(requestCache.query) requestCache.store.dataSourceDidFetchQuery(requestCache.query);
        ThothSC.requestCache.destroy(requestKey);
      }    
    }
  },
  
  onFetchError: function(fetchError){
    //function to handle Thoth error messages for fetch
    var errorCode, requestCacheKey, requestCache, message,
        query, store;

    if(fetchError){
      errorCode = fetchError.errorCode;
      requestCacheKey = fetchError.returnData.requestKey;
      if(!requestCacheKey) SC.Logger.log("this is a problem, a fetch error withou");
      requestCache = ThothSC.requestCache.retrieve(requestCacheKey);
      switch(errorCode){
        case ThothSC.THOTH_ERROR_DENIEDONPOLICY: 
          message = "The policy settings on the server don't allow you to fetch these records"; 
          break;
        case ThothSC.THOTH_ERROR_DBERROR:
          message = "The database reported an error";
          break;
        default: 
          message = "Unknown server error";
      }
      requestCache.store.dataSourceDidErrorQuery(requestCache.query);
      ThothSC.requestCache.destroy(requestCacheKey);
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_FETCH, message);
    }
  },
  
  retrieveRecords: function(store,storeKeys,ids){
    //hmm can we be sure that the record type for these storeKeys are all the same...
    //I would suspect yes...
    var recType, baseReq, recId, cacheObj, requestKey;
    
    if(storeKeys.length > 0){
      if(storeKeys.length === 1){ // store always calls retrieveRecords, even for only one record
        recId = ids? ids[0]: null;
        this.retrieveRecord(store,storeKeys[0],recId);
      }
      else { // we assume here that the model for all records to retrieve is the same
        recType = store.recordTypeFor(storeKeys[0]);
        baseReq = this.createBaseRequest(recType);
        baseReq.keys = ids;
        cacheObj = { store: store, recordType: recType, storeKeys: storeKeys };
        requestKey = ThothSC.requestCache.store(cacheObj);
        baseReq.returnData = { requestCacheKey: requestKey };
        ThothSC.client.send({ fetch: baseReq });
      }
    }
    return true;
  },
  
  retrieveRecord: function(store,storeKey,id){
    var recType = store.recordTypeFor(storeKey);
    var baseReq = this.createBaseRequest(recType);
    var recId = id? id: store.idFor(storeKey);
    var cacheObj = { 
      store: store, 
      recordType: recType, 
      storeKey: storeKey,
      id: recId,
      numResponses: this.getNumberOfResponses(baseReq,ThothSC.ACTION_REFRESH)
    };
    var requestKey = ThothSC.requestCache.store(cacheObj);
    baseReq.returnData = { requestCacheKey: requestKey };
    baseReq.key = recId;
    ThothSC.client.send({ refreshRecord: baseReq });
    return true;
  },

  onRefreshReply: function(refreshResult){
    var reqKey,reqCache,mergedData;

    if(!refreshResult) return;
    reqKey = refreshResult.returnData.requestCacheKey;
    reqCache = ThothSC.requestCache.retrieve(reqKey);
    if(!reqCache) return;

    if(reqCache.unsavedRelations){
      mergedData = ThothSC.mergeRelationSet(reqCache.recordType,[refreshResult.record],reqCache.unsavedRelations)[0];
    } 
    else mergedData = refreshResult.record;
    reqCache.record = mergedData;
    ThothSC.loadRecord(reqCache.store,reqCache.recordType,reqCache.storeKey,mergedData,(reqCache.numResponses < 2));
    if(!this.combinedReturnCalls) reqCache.numResponses -=1;
    this._finishRefresh(reqKey,reqCache); 
  },
  
  onRefreshRelationReply: function(relResult){
    var reqKey, reqCache, mergedData;
    
    if(!relResult) return;
    reqKey = relResult.returnData.requestCacheKey;
    reqCache = ThothSC.requestCache.retrieve(reqKey);
    if(!reqCache) return;
    
    if(!reqCache.record){
      if(!reqCache.unsavedRelations) reqCache.unsavedRelations = relResult.relationSet;
      else reqCache.unsavedRelations.pushObjects(relResult.relationSet);
      if(!this.combinedReturnCalls) reqCache.numResponses -= 1;      
    } 
    else {
      mergedData = ThothSC.mergeRelationSet(reqCache.recordType,[reqCache.record],relResult.relationSet)[0];
      ThothSC.loadRecord(reqCache.store,reqCache.recordType,reqCache.storeKey,mergedData,(reqCache.numResponses < 2));
      if(!this.combinedReturnCalls) reqCache.numResponses -= 1;      
    }                        
    this._finishRefresh(reqKey,reqCache);
  },
  
  _finishRefresh: function(requestKey,reqCache){
    if((this.combinedReturnCalls && reqCache.numResponses === 1) || (!this.combinedReturnCalls && reqCache.numResponses === 0)){
      if(this.debug) console.log('ThothSC: finishing off refresh request');
      ThothSC.requestCache.destroy(requestKey);
    }
  },
  
  // this is mainly the same setup as with onFetchResult, only with a single record and no dataSourceDidComplete
  // as ThothSC.loadRecord will take care of the needed actions.
  onRefreshRecordResult: function(refreshResult){
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
  
  

  onRefreshRecordError: function(refreshRecordError){
    //function to handle Thoth error messages for fetch
    var errorCode, requestCacheKey, curRequestData, message,
        storeKey, store;

    if(refreshRecordError){
      errorCode = refreshRecordError.errorCode;
      requestCacheKey = refreshRecordError.returnData.requestCacheKey;
      curRequestData = ThothSC.requestCache.retrieve(requestCacheKey);
      switch(errorCode){
        case ThothSC.THOTH_ERROR_DENIEDONPOLICY: 
          message = "The policy settings on the server don't allow you to refresh this record"; 
          break;
        case ThothSC.THOTH_ERROR_DBERROR:
          message = "The database reported an error";
          break;
        default: 
          message = "Unknown server error";
      }
      storeKey = curRequestData.storeKey;
      store = curRequestData.store;
      store.dataSourceDidError(storeKey);
      ThothSC.requestCache.destroy(requestCacheKey);
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR, message);
    }
  },
  
  
  // difference with the previous implementation: 
  // the function immediately sets the record with a temp id,
  // the return function will either destroy it again (error), or update it with the 'proper' id
  createRecord: function(store,storeKey,params){
    var recType, record, requestKey, baseReq, primKey, tempId;
    
    recType = store.recordTypeFor(storeKey);
    record = store.readDataHash(storeKey);
    baseReq = this.createBaseRequest(recType,record);
    requestKey = ThothSC.requestCache.store({ store: store, storeKey: storeKey, params: params, request: baseReq });
    baseReq.returnData = { requestCacheKey: requestKey };
    // now give the store the record back with a temp id
    primKey = recType.prototype.primaryKey;
    tempId = "@" + requestKey;
    if(primKey) record[primKey] = tempId;
    store.dataSourceDidComplete(storeKey,record,tempId);
    ThothSC.client.send({ createRecord: baseReq});
    return YES;
  },
  
  onCreateRecordError: function(createRecordError){
    var errorCode, requestCache, message, recType;
    
    if(createRecordError){
      errorCode = createRecordError.errorCode;
      requestCache = ThothSC.requestCache.retrieve(createRecordError.returnData.requestCacheKey);
      switch(errorCode){
        case ThothSC.THOTH_ERROR_DENIEDONPOLICY: 
          message = "The policy settings on the server don't allow you to create this record"; 
          requestCache.store.removeDataHash(requestCache.storeKey,SC.Record.DESTROYED_CLEAN);
          requestCache.store.dataHashDidChange(requestCache.storeKey);
          break;
        case ThothSC.THOTH_ERROR_DBERROR:
          message = "The database reported an error";
          break;
        default: 
          message = "Unknown server error";
      }
      ThothSC.requestCache.destroyObject(requestCache);
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_CREATE, message);
    }
  },
  
  onCreateRecordResult: function(result){  
    var requestCache = ThothSC.requestCache.retrieve(result.returnData.requestCacheKey),
        storeKey = requestCache.storeKey, store = requestCache.store,
        recType = requestCache.store.recordTypeFor(storeKey),
        relations = requestCache.request.relations,
        recordData = result.record,
        primKey = requestCache.request.primaryKey || recType.prototype.primaryKey || result.primaryKey || 'id',
        primKeyVal = result.key || recordData[primKey],
        pushResult;
    
    if(this.debug) SC.Logger.log('ThothSC onCreateRecordResult: ' + JSON.stringify(result));
		pushResult = store.pushRetrieve(recType,primKeyVal,recordData,storeKey);
		if(pushResult){
		  if(store.idFor(storeKey) !== primKeyVal) SC.Store.replaceIdFor(storeKey,primKeyVal); // workaround for a (possible) bug in the store
      SC.Logger.log('storeKey ' + storeKey);
      SC.Logger.log('primKeyVal ' + primKeyVal);
		  ThothSC.updateOppositeRelations(store,storeKey,{recordData:recordData, relationData: relations });
		  //if(relations && (relations.length > 0)){ // update opposite relations
		  //  relations.forEach(function(rel){ ThothSC.updateOppositeRelation(store,storeKey,rel,recordData);});
		  //}
		} 
		else ThothSC.client.applicationCallback(ThothSC.DS_ERROR_CREATE,"problem with updating the newly created record");
		ThothSC.requestCache.destroyObject(requestCache);
  },
  
  updateRecord: function(store,storeKey,params){
    var recType = store.recordTypeFor(storeKey),
        record = store.readDataHash(storeKey),
        baseReq = this.createBaseRequest(recType,record,store.idFor(storeKey)),
        numResponses = 1, requestKey;
      
    //if(this.combineReturnCalls && baseReq.relations) numResponses += baseReq.relations.length;
    requestKey = ThothSC.requestCache.store({ store: store, storeKey: storeKey, params: params, request: baseReq, numResponses: numResponses });
    baseReq.returnData = { requestCacheKey: requestKey };
    ThothSC.client.send({updateRecord: baseReq});
    return YES;
  },
  
  onUpdateRecordError: function(error){
    var requestCache, errorCode, message;
        
    if(error){
      errorCode = error.errorCode;
      requestCache = ThothSC.requestCache.retrieve(error.returnData.requestCacheKey);
      switch(errorCode){
        case ThothSC.THOTH_ERROR_DENIEDONPOLICY: 
          message = "The policy settings on the server don't allow you to update this record"; 
          break;
        case ThothSC.THOTH_ERROR_DATAINCONSISTENCY: 
          message = "There has been a data inconsistency between the server and your application."; 
          break;
        case ThothSC.THOTH_ERROR_DBERROR:
          message = "The database reported an error";
          break;
        default: 
          message = "Unknown server error";
      }
      requestCache.store.dataSourceDidError(requestCache.storeKey);
      ThothSC.requestCache.destroyObject(requestCache);
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_UPDATE, message);
    }
  },
  
  onUpdateRecordResult: function(result){
    var requestCache = ThothSC.requestCache.retrieve(result.returnData.requestCacheKey);
    // first check whether there are slave relations, and copy them on the new hash
    if(!requestCache){
      SC.Logger.log("updateRecordResult without a requestCache... this must be wrong...");
      return; 
    } 
    var rels = requestCache.request.relations.filterProperty('isMaster',false);
    var hash = requestCache.store.readDataHash(requestCache.storeKey);
    rels.forEach(function(r){
      var propName = r.propertyKey || r.propertyName;
      result.record[propName] = hash[propName];
    });
    
    requestCache.store.dataSourceDidComplete(requestCache.storeKey,result.record);
    ThothSC.requestCache.destroyObject(requestCache);
  },
  
  destroyRecord: function(store,storeKey,params){
    var recType = store.recordTypeFor(storeKey),
        record = store.readDataHash(storeKey),
        baseReq = this.createBaseRequest(recType,record,store.idFor(storeKey)),
        requestKey;
        
    requestKey = ThothSC.requestCache.store({ store: store, storeKey: storeKey, params: params, recordData: record });
    baseReq.returnData = { requestCacheKey: requestKey };
    ThothSC.client.send({deleteRecord: baseReq});
    return true;
  },
  
  onDeleteRecordError: function(error){
    var errorCode = error.errorCode, 
        requestCache = ThothSC.requestCache.retrieve(error.returnData.requestCacheKey), message;
        
    switch(errorCode){
      case ThothSC.THOTH_ERROR_DENIEDONPOLICY: 
        message = "The policy settings on the server don't allow you to delete this record"; 
        break;
      case ThothSC.THOTH_ERROR_DATAINCONSISTENCY: 
        message = "There has been a data inconsistency between the server and your application."; 
        break;
      case ThothSC.THOTH_ERROR_DBERROR:
        message = "The database reported an error";
        break;
      default: 
        message = "Unknown server error";           
    }
    requestCache.store.dataSourceDidError(requestCache.storeKey);
    ThothSC.client.applicationCallback(ThothSC.DS_ERROR_DELETE, message);
    ThothSC.requestCache.destroyObject(requestCache);
  },
  
  onDeleteRecordResult: function(result){
    var requestCache = ThothSC.requestCache.retrieve(result.returnData.requestCacheKey),
        recId;
    
    recId = requestCache.store.idFor(requestCache.storeKey);
    requestCache.store.dataSourceDidDestroy(requestCache.storeKey);
    ThothSC.updateOppositeRelations(requestCache.store, requestCache.storeKey,{recordId: recId, recordData: requestCache.recordData, isRemove: true}); // isRemove
    ThothSC.requestCache.destroyObject(requestCache);
  },
  
  onPushedCreateRecord: function(req){
    var resource = req.bucket, key = req.key,
        relations = req.relations, 
        record = req.record,
        message = "The server has tried to push a createRecord request to your application, but isn't allowed to store it",
        recType, storeKey, me = this;
    
    //SC.Logger.log("onPushedCreateRecord...");
    //console.log(req);
    recType = ThothSC.modelCache.modelFor(resource);
    if(!recType){
      SC.Logger.log("cannot update opposite relation because record type cannot be found...");
      return; // ignore pushed update
    } 

    if(relations){ // merge relation data if present
      relations.forEach(function(rel){
        ThothSC.mergeRelation(rel,record);
      });
    }
    storeKey = this._store.pushRetrieve(recType,key,req.record); // save
    // pushing will only happen when we registered for record(types) with a fetch, which sets this._store
    if(storeKey){
      ThothSC.updateOppositeRelations(me._store,storeKey,{recordData: req.record, relationData: req.relations});
      // if(req.relations){
      //   req.relations.forEach(function(rel){
      //     ThothSC.updateOppositeRelation(me._store,storeKey,rel,req.record);
      //   });
      // }
    } else {
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_PUSHCREATE,message);
    }
  },

  onPushedUpdateRecord: function(req){
    var rec = req.record,
        ret,msg,
        resource = req.bucket, key = req.key,
        recType = ThothSC.modelCache.modelFor(resource);
    
    if(req.relations){
      req.relations.forEach(function(rel){
        if((rel.type === 'toMany') && rel.propertyName){
          rec[rel.propertyName] = rel.keys;
        }
      });
    }
    if(!rec || !recType || !key){
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_PUSHUPDATE,"invalid push update request");
      return;
    }
    ret = this._store.pushRetrieve(recType,key,rec);
    if(!ret){
      msg ="The server has tried to update a record in your application, but wasn't allowed to do so!";
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_PUSHUPDATE, msg);
    }
  },
  
  onPushedDeleteRecord: function(req){
    var resource = req.bucket, key = req.key,
        recType = ThothSC.modelCache.modelFor(resource),
        recData,sK, msg;
    
    if(!resource || !recType || !key){
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_PUSHUPDATE,"invalid push delete request");
      return;      
    }
    sK = this._store.pushDestroy(recType,key);
    if(sK){
      recData = this._store.readDataHash(sK);
      ThothSC.updateOppositeRelations(this._store,sK,{recordId: key, isRemove: true, recordData: recData}); // isRemove
    } 
    else {
      msg = "The server has tried to delete a record from your application, but wasn't allowed to do so!";
      ThothSC.client.applicationCallback(ThothSC.DS_ERROR_PUSHDELETE, msg);
    }
  }
  
});