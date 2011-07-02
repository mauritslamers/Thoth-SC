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
     //SC.Logger.log("returning: " + JSON.stringify(ret));
     return ret;
  },
  
  stripRelations: function(baseRequest,record){
    if(baseRequest.relations){
      baseRequest.relations.forEach(function(rel){
        if(record[rel.propertyName]){
          rel.keys = record[rel.propertyName];
          delete record[rel.propertyName];
        } 
      }); 
    }
    return record;
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
        
    if(!oppProperty) return; // nothing to do when no opposite property has been defined...
    if(!relation.keys) return; // don't try to add anything if the keys don't exist
    else relKeys = (!(relation.keys instanceof Array))? [relation.keys]: relation.keys;

    relKeys.map(function(relKey){
      var hash,prop;
      var sK = oppRecType.storeKeyFor(relKey);
      //console.log('storeKey of oppositeRec = ' + sK);
      if(sK){ 
        hash = store.readDataHash(sK);
        prop = hash[oppProperty];
        if(prop instanceof Array) prop.push(idToAdd);
        else hash[oppProperty] = idToAdd;
        store.pushRetrieve(oppRecType,relKey,hash);
      }
    });
  }
	
	
  
});