/*globals ThothSC*/
// Builds a model graph

ThothSC.ModelGraphBuilder = SC.Object.extend({
  
  filterOneToOne: true, // setting to filter out one-to-one relations
  
  _relations: null,
  
  _properties: null,
  
  _computedProperties: null,
  
  _resource: null,
  
  _primaryKey: null,
  
  graphDidCalculate: false,
  
  resource: function(){
    if(!this.graphDidCalculate) this.contentDidChange();
    return this._resource;
  }.property(),
  
  primaryKey: function(){
    if(!this.graphDidCalculate) this.contentDidChange();
    return this._primaryKey;
  }.property(),
  
  relationsToSend: function(){
    var filter = function(rel){
      if(rel.shouldSend && !rel.preventInclusion){
        if(rel.shouldSend) delete rel.shouldSend; // let it not leak out.
        if(rel.isUpdatable) delete rel.isUpdatable; // should most certainly not leak out
        return true;
      }
    }
    var relations = ThothSC.copy(this.get('relations'),true);
    
    return relations.filter(filter);
  }.property(),
  
  relations: function(){
    if(!this.graphDidCalculate) this.contentDidChange();
    return this._relations;
  }.property(),

  relationsFor: function(record){
    var i,len,propName, parser, propValue;
    parser = function(rel){
      if(rel){
        propName = rel.propertyName;
        if(propName && record){
          propValue = record[propName];
          if(rel.type === 'toOne') rel.keys = propValue
          if(rel.type === 'toMany') rel.keys = propValue? propValue: [];
        }
      }
      return rel;
    };

    if(!this.graphDidCalculate) this.contentDidChange();
    len = this._relations? this._relations.length: 0;
    if(len===0) return this._relations;

    return this.get('relationsToSend').map(parser);
  },
  
  properties: function(){
    if(!this.graphDidCalculate) this.contentDidChange();
    return this._properties;    
  }.property(),
  
  computedProperties: function(){
    if(!this.graphDidCalculate) this.contentDidChange();
    return this._computedProperties;
  }.property(),
  
  _createRelation: function(type,prop,propName,oppositeRecType,shouldSend){
    return { 
      type: type,
      isNested: prop.isNested, 
      isChildRecord: prop.isChildRecord,
      isDirectRelation: prop.isDirectRelation,
      isMaster: prop.isMaster, 
      bucket: oppositeRecType.resource || oppositeRecType.bucket,
      primaryKey: oppositeRecType.primaryKey,
      propertyName: propName,
      shouldSend: shouldSend
    };
  },
  
  _handleToMany: function(prop,propName){
    var content = this.get('content'),
        oppositeRecType, msg, ret, oppositeProp;
        
    if(prop.kindOf(SC.ManyAttribute) || prop.kindOf(SC.ChildrenAttribute)){
      oppositeRecType = prop.typeClass().prototype;
      if(oppositeRecType === String.prototype){
        msg = "ThothSC: The record type of the toMany relation " + propName + " on model " + content.toString();
        msg +=  " was undefined. Hint: use a string to contain the path!";
        throw new Error(msg);
      }
      else {
        ret = this._createRelation('toMany',prop,propName,oppositeRecType,true);
        if(prop.oppositeProperty){
          oppositeProp = oppositeRecType[prop.oppositeProperty];
          if(prop.kindOf(SC.ManyAttribute)) ret.oppositeType = 'toMany';
          if(prop.kindOf(SC.SingleAttribute)) ret.oppositeType = 'toOne';
          if(!prop.isMaster){ 
            if(prop.isUpdatable === undefined) ret.isUpdatable = true;
            if(prop.isUpdatable === true) ret.isUpdatable = true;
          }
          else {
            if(prop.isUpdatable === true) ret.isUpdatable = true;
          }
        }
        this._relations.push(ret);              
        return true;
      }
    }
  },

  _handleToOne: function(prop,propName){
    var oppositeRecType, oppositePropName, oppositeProp, ret;
    
    if(prop.kindOf(SC.SingleAttribute) || prop.kindOf(SC.ChildAttribute)){
      oppositeRecType = prop.typeClass().prototype;
      oppositePropName = prop.oppositeProperty;
      //console.log('trying to find inverse: ' + reverse + " on " + [recordType.toString(),i].join("."));
      if(oppositePropName && oppositeRecType[oppositePropName]){
        oppositeProp = oppositeRecType[oppositePropName];
        ret = this._createRelation('toOne',prop,propName,oppositeRecType);
        if(!this.filterOneToOne && oppositeProp.kindOf(SC.SingleAttribute)){
          ret.oppositeType = 'toOne';
          ret.shouldSend = true;
          if(!prop.isMaster){
            if(prop.isUpdatable === undefined) ret.isUpdatable = true;
            if(prop.isUpdatable === true) ret.isUpdatable = true;
          }
          else {
            if(prop.isUpdatable === true) ret.isUpdatable = true;
          }
        } 
        else if(oppositeProp.kindOf(SC.ManyAttribute)){
          ret.oppositeType = 'toMany';
          ret.shouldSend = true;
          if(prop.isUpdatable === true) ret.isUpdatable = true;
          if(prop.isUpdatable === undefined) ret.isUpdatable = true;
        }
        this._relations.push(ret); 
        return true;
      }
    }
  },
  
  _handleRCP: function(prop,propName){
    var funcCode;
    
    if(prop.isRemoteComputedProperty){
      funcCode = prop.computation.toString().replace("\t","").replace("\n","");
      this._computedProperties.push({ 
        propertyName: propName, 
        //functionBody: prop.computation.toString(), 
        functionBody: funcCode,
        dependencies: prop.dependencies
      });
      return true;
    }
  },
  
  contentDidChange: function(){
    var content = this.get('content'),
        recType = content.prototype,
        i,curItem, handled;
      
    this._relations = [];
    this._properties = [];
    this._computedProperties = [];
        
    for(i in recType){
      handled = false;
      curItem = recType[i];
      if(curItem && curItem.kindOf && curItem.kindOf(SC.RecordAttribute)){
        handled = this._handleToMany(curItem,i);
        if(!handled) handled = this._handleToOne(curItem,i);
        if(!handled) handled = this._handleRCP(curItem,i);
        if(!handled){ // just a normal attribute, push to properties
          this._properties.push({
            key: recType[i].key || i,
            type: this.getDataType(recType[i].type)
          });
        }
      }
      if(i === 'primaryKey') this._primaryKey = curItem;
      if(i === 'bucket' || i === 'resource') this._resource = curItem;
    }
    if(!this._resource) throw new Error('Trying to create a model graph without a resource on the model!');
    this.graphDidCalculate = true;
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
    if(type == SC.DateTime) ret = "Date";
    //console.log('data type detected is: ' + ret);
    //if(ret === "") ret = type.toString();
    return ret;
  },
  
  graph: function(){
    return {
      properties: this.get('properties'),
      relations: this.get('relations'),
      computedProperties: this.get('computedProperties'),
      primaryKey: this.get('primaryKey'),
      resource: this.get('resource')
    };
  }.property()
  
  
});