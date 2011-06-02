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
  
  //events
  CONNECTION_CLOSED: 'closed ', 
  CONNECTION_OPENED: 'opened',
  CONNECTION_ERROR: 'error',
  DS_ERROR: 'ds_error',
  
  MD5: 'md5', // encryption schemes for passwords
  RIPEMD160: 'ripemd160',
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA512: 'sha512',
  
  client: null, // the data source will hook up the proper client here
  
  requestCache: null // initialising a data source will put a request cache manager here
  
}) ;