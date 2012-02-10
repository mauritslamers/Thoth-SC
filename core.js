// ==========================================================================
// Project:   ThothSC
// Copyright: ©2010 Maurits Lamers
// ==========================================================================
/*globals ThothSC */

/** @namespace

  A framework to connect to the Thoth server application
  
  @extends SC.Object
*/
ThothSC = SC.Object.create(
  /** @scope Thoth.prototype */ {

  NAMESPACE: 'ThothSC',
  VERSION: '0.1.0',

  SOCKETIO: 'socket.io', // traffic specifications
  FAKE: 'fake', // fake client, for testing purposes and other offline tricks
  
  //events
  CONNECTION_CLOSED: 'connection_closed ', 
  CONNECTION_OPENED: 'connection_opened',
  CONNECTION_ERROR: 'connection_error',
  CONNECTION_REAUTHFAILED: 'reauth_failed',
  DS_ERROR_FETCH: 'ds_error_fetch',
  DS_ERROR_REFRESH: 'ds_error_refresh',
  DS_ERROR_CREATE: 'ds_error_create',
  DS_ERROR_UPDATE: 'ds_error_update',
  DS_ERROR_DELETE: 'ds_error_delete',
  DS_ERROR_PUSHCREATE: 'ds_error_pushcreate',
  DS_ERROR_PUSHUPDATE: 'ds_error_pushupdate',
  DS_ERROR_PUSHDELETE: 'ds_error_pushdelete',
  
  ACTION_FETCH : 'fetch',
  ACTION_REFRESH : 'refreshRecord',
  ACTION_CREATE : 'createRecord',
  ACTION_UPDATE : 'updateRecord',
  ACTION_DELETE : 'deleteRecord',
  ACTION_RPC : 'rpcRequest',
  ACTION_LOGOUT : "logOut",
  ACTION_FETCH_REPLY : "fetch_reply",
  ACTION_FETCH_RELATION_REPLY : "fetch_relation_reply",
  ACTION_REFRESH_REPLY : 'refreshRecord_reply', 
  ACTION_REFRESH_RELATION_REPLY : 'refreshRecord_relation_reply',
  ACTION_CREATE_REPLY : 'createRecord_reply',
  ACTION_UPDATE_REPLY : 'updateRecord_reply',
  ACTION_DELETE_REPLY : 'deleteRecord_reply',
  ACTION_FETCH_ERROR : "fetch_error",
  ACTION_REFRESH_ERROR : 'refreshRecord_error',
  ACTION_CREATE_ERROR : 'createRecord_error',
  ACTION_UPDATE_ERROR : 'updateRecord_error',
  ACTION_DELETE_ERROR : 'deleteRecord_error', 
  ACTION_ERROR_REPLY : 'error_reply',
  
  THOTH_ERROR_DENIEDONPOLICY: 0,
  THOTH_ERROR_DATAINCONSISTENCY: 1,
  THOTH_ERROR_DBERROR: 3,
  
  MD5: 'md5', // encryption schemes for passwords
  RIPEMD160: 'ripemd160',
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA512: 'sha512',
  
  client: null, // the data source will hook up the proper client here
  
  requestCache: null, // initialising a data source will put a request cache manager here

  init: function(){
    arguments.callee.base.apply(this,arguments); // do sc_super
    // create statesMixin
    this._createStatesMixin();
  },
  
  _singleApplicationCallback: false, // can be set by connect
  
  _createStatesMixin: function(){
    // events are all CONNECTION_ and DS_ERROR messages
    var createF = function(name){
      return function(data){
        SC.Logger.log("ThothSC state mixin: " + name + ": " + data);
      };
    };
    
    var i, ret = {};
    for(i in this){
      if(this.hasOwnProperty(i)){
        if( (i.search("CONNECTION_") === 0) || (i.search("DS_ERROR_") === 0) ){ // if event for states
          ret[i] = createF(i);
        } 
      }
    }
    this.statesMixin = ret;
  }
 
  // statesMixin: { 
  //   connection_closed: function(data){
  //     SC.Logger.log("ThothSC state mixin: Connection closed");
  //   },             
  //   connection_opened: function(data){
  //     SC.Logger.log("ThothSC state mixin: Connection opened");
  //   },
  //   connection_error: function(data){
  //     SC.Logger.log("ThothSC state mixin: Connection error");
  //   },
  //   reauth_failed: function(data){
  //     SC.Logger.log("ThothSC state mixin: reauth failed");
  //   }
  // }
}) ;