/*globals ThothSC */

sc_require('lib/crypto/basic_crypto');

ThothSC.CryptoRIPEMD160 = ThothSC.Crypto.create({
  hex: function(s){
    return this.rstr2hex(this.rstr(this.str2rstr_utf8(s)));
  },
  
  b64: function(s){
    return this.rstr2b64(this.rstr(this.str2rstr_utf8(s)));
  },
  
  any: function(s,e){
    return this.rstr2any(this.rstr(this.str2rstr_utf8(s)));
  },
  
  hex_hmac: function(k,d){
    return this.rstr2hex(this.rstr_hmac(this.str2rstr_utf8(k), this.str2rstr_utf8(d))); 
  },
  
  b64_hmac: function(k,d){
    return this.rstr2b64(this.rstr_hmac(this.str2rstr_utf8(k), this.str2rstr_utf8(d)));
  },
  
  any_hmac: function(k,d,e){
    return this.rstr2any(this.rstr_hmac(this.str2rstr_utf8(k), this.str2rstr_utf8(d)),e);
  },
  
  vm_test: function(){
    return this.hex("abc").toLowerCase() == "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc";
  },
  
  rstr: function(s){
    return this.binl2rstr(this.binl(this.rstr2binl(s), s.length * 8));
  },
  
  rstr_hmac: function(key,data){
    var bkey = this.rstr2binl(key);
    var ipad = [], opad = [], i, hash;
    
    if(bkey.length > 16) bkey = this.binl(bkey, key.length * 8);

    for(i=0;i<16;i+=1){
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    hash = this.binl(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
    return this.binl2rstr(this.binl(opad.concat(hash), 512 + 160));
  },
  
  binl: function(x,len){
    /* append padding */
    
    var h0 = 0x67452301;
    var h1 = 0xefcdab89;
    var h2 = 0x98badcfe;
    var h3 = 0x10325476;
    var h4 = 0xc3d2e1f0;
    
    var T, A1, B1, C1, D1, E1;
    var A2, B2, C2, D2, E2;
    var i,j,x_len;
    var safe_add = this.safe_add;
    var bit_rol = this.bit_rol;
    
    var rmd160_f = function(j, x, y, z){
      return ( 0 <= j && j <= 15) ? (x ^ y ^ z) :
             (16 <= j && j <= 31) ? (x & y) | (~x & z) :
             (32 <= j && j <= 47) ? (x | ~y) ^ z :
             (48 <= j && j <= 63) ? (x & z) | (y & ~z) :
             (64 <= j && j <= 79) ? x ^ (y | ~z) :
             "rmd160_f: j out of range";
    };
    
    var rmd160_K1 = function(j){
      return ( 0 <= j && j <= 15) ? 0x00000000 :
             (16 <= j && j <= 31) ? 0x5a827999 :
             (32 <= j && j <= 47) ? 0x6ed9eba1 :
             (48 <= j && j <= 63) ? 0x8f1bbcdc :
             (64 <= j && j <= 79) ? 0xa953fd4e :
             "rmd160_K1: j out of range";
    };
    var rmd160_K2 = function(j){
      return ( 0 <= j && j <= 15) ? 0x50a28be6 :
             (16 <= j && j <= 31) ? 0x5c4dd124 :
             (32 <= j && j <= 47) ? 0x6d703ef3 :
             (48 <= j && j <= 63) ? 0x7a6d76e9 :
             (64 <= j && j <= 79) ? 0x00000000 :
             "rmd160_K2: j out of range";
    };
    var rmd160_r1 = [
       0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
       7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
       3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
       1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
       4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13
    ];
    var rmd160_r2 = [
       5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
       6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
      15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
       8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
      12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11
    ];
    var rmd160_s1 = [
      11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
       7,  6,  8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
      11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
       9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6
    ];
    var rmd160_s2 = [
       8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
       9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
       9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
      15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
       8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11
    ];
    
    
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    
    x_len = x.length;

    for (i = 0; i < x_len; i += 16) {
      A1 = h0; B1 = h1; C1 = h2; D1 = h3; E1 = h4;
      A2 = h0; B2 = h1; C2 = h2; D2 = h3; E2 = h4;
      for (j = 0; j <= 79; j+=1) {
        T = safe_add(A1, rmd160_f(j, B1, C1, D1));
        T = safe_add(T, x[i + rmd160_r1[j]]);
        T = safe_add(T, rmd160_K1(j));
        T = safe_add(bit_rol(T, rmd160_s1[j]), E1);
        A1 = E1; E1 = D1; D1 = bit_rol(C1, 10); C1 = B1; B1 = T;
        T = safe_add(A2, rmd160_f(79-j, B2, C2, D2));
        T = safe_add(T, x[i + rmd160_r2[j]]);
        T = safe_add(T, rmd160_K2(j));
        T = safe_add(bit_rol(T, rmd160_s2[j]), E2);
        A2 = E2; E2 = D2; D2 = bit_rol(C2, 10); C2 = B2; B2 = T;
      }
      T = safe_add(h1, safe_add(C1, D2));
      h1 = safe_add(h2, safe_add(D1, E2));
      h2 = safe_add(h3, safe_add(E1, A2));
      h3 = safe_add(h4, safe_add(A1, B2));
      h4 = safe_add(h0, safe_add(B1, C2));
      h0 = T;
    }
    return [h0, h1, h2, h3, h4];
  }
  
});


