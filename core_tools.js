/*globals ThothSC */
// functions that act as a toolbox for ThothSC

SC.mixin(ThothSC, {
  
  createRequestCacheKey: function(){
     // the idea for this method was copied from the php site: 
     // http://www.php.net/manual/en/function.session-regenerate-id.php#60478
     var keyLength = 32,
         keySource = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
         keySourceLength = keySource.length + 1, // we need to add one, to make sure the last character will be used in generating the key
         ret = [],
         curCharIndex = 0;
     
     for(var i=0;i<=keyLength;i++){
        curCharIndex = Math.floor(Math.random()*keySourceLength);
        ret.push(keySource[curCharIndex]);
     }
     return ret.join('');
  },
  
  userDataCreator: function(userdata){
    var closureKey = ThothSC.createRequestCacheKey(), 
        value = userdata;  

    return SC.Object.create({
      key: function(){
        //for now just return the key, but we can implement extra security stuff here
        return closureKey;
      },

      user: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.user;
        } 
      },

      sessionKey: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.sessionKey;
        }
      },

      role: function(key){
        if(key === closureKey){
          closureKey = ThothSC.createRequestCacheKey();
          return value.role;
        } 
      },
      
      isAuthenticated: function(){
        if(value.user && value.sessionKey) return YES;
        else return NO;
      }
    });

  },
  
  
  processRelationSet: function(records,relationSet) {
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
     
     var i,j,numrecords,numrelations, curRel, curRelData, curRec, curRecKey;
     var ret = [];
     // walk through the records one by one and look whether there are relations
     numrelations = relationSet.length;
     //console.log("trying to add " + numrelations + " relations");
     for(i=0,numrecords=records.length;i<numrecords;i++){
        curRec = records[i];
        curRecKey = curRec.key;
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
  
  getAttributes: function(recordType){
    // function to get all RecordAttributes
    // it will separate out the relations and return an object: { properties: [], relations: []}
    var recType = recordType.prototype,
        ret = { properties: [], relations: [], computedProperties: [], primaryKey: recType.primaryKey }, 
        curItem, oppositeRecType, i, keyName, typeName, itemHandled, funcCode;
    
    for(i in recType){
      curItem = recType[i];
      if(curItem){
        if(curItem.kindOf && curItem.kindOf(SC.RecordAttribute)){ 
          itemHandled = false;
          if(curItem.kindOf(SC.ManyAttribute)){
            // get the opposite record type
            oppositeRecType = curItem.typeClass().prototype;
            if(oppositeRecType === String.prototype){
              var msg = "The record type of the toMany relation " + i + " on model " + recordType.toString();
              msg +=  " was undefined. Hint: use a string to contain the path!";
              throw new Error(msg);
            }
            else {
              ret.relations.push({ 
                type: 'toMany', 
                isMaster: curItem.isMaster,
                bucket: oppositeRecType.bucket, 
                primaryKey: oppositeRecType.primaryKey,
                propertyName: i });              
            }
            itemHandled = true;
          }
          if(curItem.kindOf(SC.SingleAttribute)){
            oppositeRecType = curItem.typeClass().prototype;
            var reverse = curItem.inverse;
            // check whether the reverse is a toMany
            if(reverse && oppositeRecType[reverse] && oppositeRecType[reverse].kindOf(SC.ManyAttribute)){
              ret.relations.push({ 
                type: 'toOne', 
                isMaster: curItem.isMaster,
                bucket: oppositeRecType.bucket, 
                primaryKey: oppositeRecType.primaryKey,
                propertyName: i}); 
            }
            itemHandled = true;  
          }
          if(curItem.isRemoteComputedProperty){
            funcCode = curItem.computation.toString().replace("\t","").replace("\n","");
            ret.computedProperties.push({ propertyName: i, functionBody: curItem.computation.toString(), dependencies: curItem.dependencies});
            itemHandled = true;
          }
          if(!itemHandled){ 
            // just a normal attribute, push to properties
            keyName = recType[i].key || i;
            typeName = ThothSC.getDataType(recType[i].type);
            ret.properties.push({key: keyName, type: typeName });            
          }
          // 
        } // end of normal attributes, now find computed properties
        //else {
        //  if( (SC.typeOf(curItem) === 'function') && curItem.isProperty && recType.hasOwnProperty(i) ){
        //    ret.computedProperties.push({ propertyName: i, functionBody: curItem.toString()});
        //  }
        //}
      }
    }
    return ret;
  },
   
  getDataType: function(type){
    var ret = "";
    if(type == String) ret = "String";
    if(type == Array) ret = "Array";
    if(type == Object) ret = "Object";
    if(type == Number) ret = "Number";
    if(type == Math) ret = "Math";
    if(type == Date) ret = "Date";
    if(type == Boolean) ret = "Boolean";
    if(type == RegExp) ret = "RegExp";
    //console.log('data type detected is: ' + ret);
    //if(ret === "") ret = type.toString();
    return ret;
  }
  
});