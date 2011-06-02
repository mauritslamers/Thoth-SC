/*globals ThothSC */

sc_require('lib/crypto/basic_crypto');

ThothSC.CryptoSHA1 = ThothSC.Crypto.create({
  vm_test: function(){
    return this.hex("abc").toLowerCase() == "a9993e364706816aba3e25717850c26c9cd0d89d";
  },
  
  rstr: function(s){
    return this.binb2rstr(this.binb(this.rstr2binb(s), s.length * 8));
  },
  
  //Calculate the HMAC-SHA1 of a key and some data (raw strings)
  rstr_hmac: function(key,data){
    var bkey = this.rstr2binb(key), hash,i,
        ipad = [], opad = [];
    
    if(bkey.length > 16) bkey = this.binb(bkey, key.length * 8);

    for(i=0;i<16;i+=1){
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    hash = this.binb(ipad.concat(this.rstr2binb(data)), 512 + data.length * 8);
    return this.binb2rstr(this.binb(opad.concat(hash), 512 + 160));
  },
  
  binb: function(x,len){
    var w = [],
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878,
        e = -1009589776,
        safe_add = this.safe_add,
        bit_rol = this.bit_rol;
    
    var sha1_ft = function(t, b, c, d){
          if(t < 20) return (b & c) | ((~b) & d);
          if(t < 40) return b ^ c ^ d;
          if(t < 60) return (b & c) | (b & d) | (c & d);
          return b ^ c ^ d;
    };
    
    var sha1_kt = function(t){
      return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
             (t < 60) ? -1894007588 : -899497514;
    };
    
    var olda,oldb,oldc,oldd,olde;
    var i,j,x_len,t;
    /* append padding */
     x[len >> 5] |= 0x80 << (24 - len % 32);
     x[((len + 64 >> 9) << 4) + 15] = len;
     
     x_len = x.length;
     
     for(i=0;i<x_len;i+= 16){
       olda = a; oldb = b; oldc = c; oldd = d; olde = e;

       for(j=0;j<80;j+=1){
         if(j < 16) w[j] = x[i + j];
         else w[j] = bit_rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
         t = safe_add(safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)),
                          safe_add(safe_add(e, w[j]), sha1_kt(j)));
         e = d; d = c;
         c = bit_rol(b, 30);
         b = a; a = t;
       }

       a = safe_add(a, olda);
       b = safe_add(b, oldb);
       c = safe_add(c, oldc);
       d = safe_add(d, oldd);
       e = safe_add(e, olde);
     }
     return [a,b,c,d,e]; 
  }
  
});
