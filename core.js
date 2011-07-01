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
  
  WEBSOCKET: 'ws', // traffic specifications
  XHRPOLLING: 'xhrpol',
  FAKE: 'fake', // fake client, for testing purposes and other offline tricks
  
  //events
  CONNECTION_CLOSED: 'closed ', 
  CONNECTION_OPENED: 'opened',
  CONNECTION_ERROR: 'error',
  DS_ERROR_FETCH: 'ds_error_fetch',
  DS_ERROR_REFRESH: 'ds_error_refresh',
  DS_ERROR_CREATE: 'ds_error_create',
  DS_ERROR_UPDATE: 'ds_error_update',
  DS_ERROR_DELETE: 'ds_error_delete',
  DS_ERROR_PUSHCREATE: 'ds_error_pushcreate',
  DS_ERROR_PUSHUPDATE: 'ds_error_pushupdate',
  DS_ERROR_PUSHDELETE: 'ds_error_pushdelete',
  
  MD5: 'md5', // encryption schemes for passwords
  RIPEMD160: 'ripemd160',
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA512: 'sha512',
  
  client: null, // the data source will hook up the proper client here
  
  requestCache: null // initialising a data source will put a request cache manager here
  
}) ;