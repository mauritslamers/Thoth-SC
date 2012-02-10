/*globals ThothSC*/

SC.mixin(ThothSC,{
  
  loadRecord: function(store,recordType,storeKey,dataHash,isComplete) {
		// copy this behaviour from dataSource did complete and pushRetrieve
		var primKey = recordType.prototype.primaryKey;
		var id = dataHash[primKey] || dataHash.key || dataHash.id; // when id doesn't exist, try key
		var status, K = SC.Record;
		if(id){
			if(storeKey === undefined){
				storeKey = recordType.storeKeyFor(id); 
				status = isComplete? K.READY_CLEAN: K.BUSY_LOADING;
			} 
			else {
				// EMPTY, ERROR, READY_CLEAN, READY_NEW, READY_DIRTY, DESTROYED_CLEAN, DESTROYED_DIRTY
				status = store.readStatus(storeKey);
				if (!(status & K.BUSY)) throw K.BAD_STATE_ERROR; // should never be called in this state

				// otherwise, determine proper state transition
				if(status===K.BUSY_DESTROYING) throw K.BAD_STATE_ERROR ;
			  else status = isComplete? K.READY_CLEAN : K.BUSY_LOADING ;
			}
			//console.log("Writing data " + JSON.stringify(dataHash) + " with status " + status + " and storeKey: " + storeKey);
			store.writeStatus(storeKey, status) ;
			store.writeDataHash(storeKey, dataHash, status) ;

			var statusOnly = NO;
			store.dataHashDidChange(storeKey, null, statusOnly);
			return storeKey ;         
		}
		else {
			console.log('Whoops, uploading a record without id? Record: ' + JSON.stringify(dataHash));
			throw "Whoops, uploading a record without ID??";
		}
	},
	
	mergeRelationSet: function(recordType,records,relationSet) {
     // function to parse a relationSet object and set the properties to the records
     // returns the records with the relations

     /* response body: 
      [{"fetchResult":{"relationSet": [{"bucket":"teacher",
        "keys":["MT8jQ54bZk4uLRw9VDXMmh0MznR","Sk4cDo9ZexkQZb1HmiHxr4x0pMc","2","3"],
        "propertyName":"exams",
        "data":{
           "2":["1PQVFFjFHhHwWC6noi5fBzoVzBu","4V4MrkoHAXVqre9X9x3rrYAHDVT"],
           "3":[],
           "MT8jQ54bZk4uLRw9VDXMmh0MznR":[],
           "Sk4cDo9ZexkQZb1HmiHxr4x0pMc":[]
        }
        }]}}]
     */
     //SC.Logger.log("parsing relationset: " + JSON.stringify(relationSet));
     var i,j,numrecords,numrelations, curRel, curRelData, curRec, curRecKey;
     var ret = [];
     var primaryKey = recordType.prototype.primaryKey;
     // walk through the records one by one and look whether there are relations
     numrelations = relationSet.length;
     //console.log("trying to add " + numrelations + " relations");
     for(i=0,numrecords=records.length;i<numrecords;i++){
        curRec = records[i];
        curRecKey = curRec[primaryKey];
        for(j=0;j<numrelations;j++){
           curRel = relationSet[j];
           curRelData = curRel.data[curRecKey];
           if(curRelData){
              curRec[curRel.propertyName] = curRelData;
           }
        }// end relation parsing
        ret.push(curRec);
     }
     return ret;
  },
  
  stripRelations: function(baseRequest){
    var stripper = function(rel){
      if(baseRequest.record[rel.propertyName]){
        delete baseRequest.record[rel.propertyName];
      }
    };
    
    if(baseRequest.relations && baseRequest.record){
      baseRequest.relations.forEach(stripper); 
    }
    return baseRequest;
  },
  
  mergeRelation: function(relation,record){
    var keys = relation.keys,
        propName = relation.propertyName;
        
    if(keys && propName){
      if(!record[propName]){ // don't overwrite
        record[propName] = keys;
      }
    }
    return record;
  },
  
  /*
    What should updateOppositeRelations do:
    it should update the opposite side of a known relationship
    so if an update of the relationship has been detected 
    (createRecord, updateRecord, deleteRecord, pushRetrieve, pushDestroy)
    it should update opposite relations with the new data
    this means adding the current record to the opposite side of the known relations
    and destroying it when the record is being destroyed

    relations are expressed on both sides always, if not, they won't be updated anyway

    one_m-to-one_m => update only if isUpdatable is true
    one_m-to-one => update unless isUpdatable is false
    one_m-to-many => update unless isUpdatable is false

    the old stuff works great whenever the relation is actually there on the returndata
    Problem is that the one-to-one are never on the returndata (normally)

    myRel: SC.Record.toOne('someModel',{ isUpdatable })... this is actually the opposite...

    so:
    - run through all relations in the system
    - if the data of the relations is available, use it
    - if not, check whether it is a one-to-one relation, if yes, set the relKeys
  */
  
  updateOppositeRelations: function(store,storeKey,opts){
      
    var recordType = store.recordTypeFor(storeKey),
        modelGraph = ThothSC.modelCache.modelGraphFor(recordType),
        relations = modelGraph.get('relations'),
        recType = recordType.prototype,
        recId = opts.recordData? opts.recordData[recType.primaryKey]: opts.recordId; 
    
    var relParser = function(rel){
      var oppSide, oppRecType, oppProperty, oppRelation, relKeys, relData;

      var updater = function(relKey){
        var hash,prop;
        var sK = oppRecType.storeKeyFor(relKey);
        if(sK){ 
          hash = store.readDataHash(sK);
          if(!hash) return; // we cannot update a non-existing hash
          prop = hash[oppProperty];
          // what are we updating here...
          if(oppRelation.kindOf(SC.ManyAttribute)){//  || prop.kindOf(SC.ChildrenAttribute)){
          //if(oppRelation.type === 'toMany'){
            if(prop){
              if(opts.isRemove) prop.removeObject(recId)//prop = prop.without(recId);
              else prop.pushObject(recId);
            }
            else hash[oppProperty] = opts.isRemove? []: [recId];
          }
          if(oppRelation.kindOf(SC.SingleAttribute)){//} || prop.kindOf(SC.ChildAttribute)){
          //if(oppRelation.type === 'toOne'){ 
            hash[oppProperty] = opts.isRemove? null: recId;
          }
          store.pushRetrieve(oppRecType,relKey,hash);
        }      
      };

      var isUpdatable = function(rel){
        if(rel.isMaster){
          if(rel.isUpdatable === true) return true;
          else return false;
        }
        else {
          if(rel.isUpdatable === false) return false;
          return true;
        }
      };

      oppSide = recType[rel.propertyName];
      oppRecType = oppSide.typeClass();
      oppProperty = oppSide.oppositeProperty;

      if(!oppProperty) return; // nothing to do when no opposite property has been defined...
      oppRelation = oppRecType.prototype[oppProperty];
      if(!isUpdatable(oppRelation)) return; // don't update when the opposite side doesn't want updates
      
      relData = opts.relationData? opts.relationData.findProperty('bucket',rel.bucket): null;
      if(!relData){ // take the property value off the record when no relation data available
        relKeys = opts.recordData[rel.propertyName];
        relKeys = (relKeys instanceof Array)? relKeys: [relKeys];
      }
      else {
        relKeys = (!(relData.keys instanceof Array))? [relData.keys]: relData.keys;
      }
      if(relKeys && (relKeys instanceof Array)) relKeys.forEach(updater); // run actual updater
    };
        
    relations.forEach(relParser);      
  },
  
  
  // DEPRECATED!!
  // while Thoth returns the id(s) of this side of the relation, we also need to update the hash on the other 
  // side of the relation. So, what we need to do here is to find the record(s) to which are pointed and update 
  // them accordingly.
  // two cases: if opposite side is a toOne: set the key, if a toMany, push or create the array
  // needed: the opposite record type, the id of the op rec, the storeKey to get the hash, the propertyName on the opposite and the id to 
  // set it to
  updateOppositeRelation: function(store,storeKey,relation,recordData){
    var recordType = store.recordTypeFor(storeKey),
        recType = recordType.prototype,
        idToAdd = recordData[recType.primaryKey],
        oppRecType = recType[relation.propertyName].typeClass(),
        oppProperty = recType[relation.propertyName].oppositeProperty,
        relKeys;
    
    var updater = function(relKey){
      var hash,prop;
      var sK = oppRecType.storeKeyFor(relKey);
      //console.log('storeKey of oppositeRec = ' + sK);
      if(sK){ 
        hash = store.readDataHash(sK);
        prop = hash[oppProperty];
        if(prop instanceof Array) prop.pushObject(idToAdd);
        else hash[oppProperty] = idToAdd;
        store.pushRetrieve(oppRecType,relKey,hash);
      }      
    };
        
    if(!relation.isUpdatable) return; // if we shouldn't update this one, we shouldn't update this one
    if(!oppProperty) return; // nothing to do when no opposite property has been defined...
    
    if(!relation.keys) return; // don't try to add anything if the keys don't exist
    else relKeys = (!(relation.keys instanceof Array))? [relation.keys]: relation.keys;
    
    relKeys.forEach(updater);
  }
	
	
  
});