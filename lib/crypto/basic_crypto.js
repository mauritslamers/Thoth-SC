/*globals ThothSC */

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

// Adapted for use in SC and Thoth

ThothSC.Crypto = SC.Object.extend({
  
  /*
   * Configurable variables. You may need to tweak these to be compatible with
   * the server-side, but the defaults work in most cases.
   */
  
  hexcase: 0, /* hex output format. 0 - lowercase; 1 - uppercase        */
  b64pad: "", /* base-64 pad character. "=" for strict RFC compliance   */
  
  
  /*
   * These are the functions you'll usually want to call
   * They take string arguments and return either hex or base-64 encoded strings
   */
  
  hex: function(s){
    return this.rstr2hex(this.rstr(this.str2rstr_utf8(s)));
  },

  b64: function(s){
   return this.rstr2b64(this.rstr(this.str2rstr_utf8(s)));
  },

  any: function(s,e) {
   return this.rstr2any(this.rstr(this.str2rstr_utf8(s)),e);
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
  
  //Convert a raw string to a hex string
  rstr2hex: function(input){
    var hexcase = this.hexcase || 0;
    var hex_tab = hexcase? "0123456789ABCDEF" : "0123456789abcdef";
    var output = "";
    var x,i,len=input.length;
    for(i=0;i<len;i+=1){
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F);
      output += hex_tab.charAt(x & 0x0F);
    }
    return output;
  },
  
  //Convert a raw string to a base-64 string
  rstr2b64: function(input){
    var b64pad = this.b64pad || '';
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    var i,j,len = input.length;
    var one,two,three,triplet;
    for(i=0;i<len;i+=3){
      one = input.charCodeAt(i) << 16;
      two = ((i + 1) < len)? (input.charCodeAt(i+1) << 8) : 0;
      three = ((i + 2) < len)? input.charCodeAt(i+2): 0;
      triplet = one | two | three; 
      for(j=0;j<4;j+=1){
        if(((i * 8) + (j * 6)) > (input.length * 8)) output += b64pad;
        else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
      }
    }
    return output;    
  },
  
  //Convert a raw string to an arbitrary string encoding
  rstr2any: function(input,encoding){
    var divisor = encoding.length,
        i,i2,j,q,x,quotient,len,
        dividend = [], div_len = Math.ceil(input.length/2),
        full_length = Math.ceil(input.length * 8 / (Math.log(divisor) / Math.log(2))),
        remainders=[], output = "";
    
    for(i=0;i<div_len;i+=1){
      i2 = i*2;
      dividend[i] = (input.charCodeAt(i2) << 8) | input.charCodeAt(i2 + 1);
    }
    
    for(j=0;j<full_length;j+=1){
      quotient = [];
      x = 0;
      for(i=0;i<div_len;i+=1){
        x = (x << 16) + dividend[i];
        q = Math.floor(x / divisor);
        x -= q * divisor;
        if(quotient.length > 0 || q > 0) quotient.push(q);
      }
      remainders[j] = x;
      dividend = quotient;
    }
    
    /* Convert the remainders to the output string */
    output = "";
    len = remainders.length -1;
    for(i = len; i >= 0; i-=1){
      output += encoding.charAt(remainders[i]);
    }      
    return output;
  },
  
  //Encode a string as utf-8.
  //For efficiency, this assumes the input is valid utf-16.
  
  str2rstr_utf8: function(input){
    var output = "";
    var i, len = input.length;
    var x, y;
    
    for(i=0;i<len;i+=1){
      /* Decode utf-16 surrogate pairs */
      x = input.charCodeAt(i);
      y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF){
        x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
        i+=1;
      }

      /* Encode output as utf-8 */
      if(x <= 0x7F) output += String.fromCharCode(x);
      else if(x <= 0x7FF){
        output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),0x80 | ( x & 0x3F));
      }                                    
      else if(x <= 0xFFFF){
        output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                      0x80 | ((x >>> 6 ) & 0x3F),
                                      0x80 | ( x         & 0x3F));
      }
      else if(x <= 0x1FFFFF){
        output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                      0x80 | ((x >>> 12) & 0x3F),
                                      0x80 | ((x >>> 6 ) & 0x3F),
                                      0x80 | ( x         & 0x3F));
      }
    }
    return output;
  },
  
  //Encode a string as utf-16
  str2rstr_utf16le: function(input){
    var output = "";
    var i,len = input.length;
    for(i=0;i<len;i+=1){
      output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                    (input.charCodeAt(i) >>> 8) & 0xFF);
    }
    return output;    
  },
  
  str2rstr_utf16be: function(input){
    var output = "";
    var i,len = input.length;
    for(i = 0; i < len; i++){
      output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF, input.charCodeAt(i) & 0xFF);
    }
    return output;
  },
  
  //Convert a raw string to an array of little-endian words
  // Characters >255 have their high-byte silently ignored.
  rstr2binl: function(input){
    var output = [], i, output_pos,
        len = input.length * 8;
    
    for(i=0;i<len;i+=8){
      output_pos = i>>5;
      if(output[output_pos] === undefined) output[output_pos] = 0;
      output[output_pos] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
    }
    return output; 
  },
  
  rstr2binb: function(input){
    var output = [], i, output_pos,
        len = input.length * 8;
    
    for(i=0;i<len;i+=8){
      output_pos = i >> 5;
      if(output[output_pos] === undefined) output[output_pos] = 0;
      output[output_pos] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
    }    
    return output;
  },
  
  
  //Convert an array of little-endian words to a string
  binl2rstr: function(input){
    var output = "", i, len = input.length * 32;
    for(i=0;i<len;i+=8){
      output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
    }
    return output;
  },

  // Convert an array of big-endian words to a string
  binb2rstr: function(input){
    var output = "",i, len = input.length * 32;
    for(i = 0; i < len; i += 8){
      output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
    }
    return output;
  },
  
  //Add integers, wrapping at 2^32. This uses 16-bit operations internally
  //to work around bugs in some JS interpreters.
  safe_add: function(x, y){
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  },
  
  //Bitwise rotate a 32-bit number to the left.
  bit_rol: function(num, cnt){
    return (num << cnt) | (num >>> (32 - cnt));
  },
  
  /*
  //A constructor for 64-bit numbers
  function int64(h, l)
  {
    this.h = h;
    this.l = l;
    //this.toString = int64toString;
  }

  //Copies src into dst, assuming both are 64-bit numbers
  function int64copy(dst, src)
  {
    dst.h = src.h;
    dst.l = src.l;
  }

  //Right-rotates a 64-bit number by shift
  //Won't handle cases of shift>=32
  //The function revrrot() is for that
  function int64rrot(dst, x, shift)
  {
      dst.l = (x.l >>> shift) | (x.h << (32-shift));
      dst.h = (x.h >>> shift) | (x.l << (32-shift));
  }

  //Reverses the dwords of the source and then rotates right by shift.
  //This is equivalent to rotation by 32+shift
  function int64revrrot(dst, x, shift)
  {
      dst.l = (x.h >>> shift) | (x.l << (32-shift));
      dst.h = (x.l >>> shift) | (x.h << (32-shift));
  }

  //Bitwise-shifts right a 64-bit number by shift
  //Won't handle shift>=32, but it's never needed in SHA512
  function int64shr(dst, x, shift)
  {
      dst.l = (x.l >>> shift) | (x.h << (32-shift));
      dst.h = (x.h >>> shift);
  }

  //Adds two 64-bit numbers
  //Like the original implementation, does not rely on 32-bit operations
  function int64add(dst, x, y)
  {
     var w0 = (x.l & 0xffff) + (y.l & 0xffff);
     var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
     var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
     var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
     dst.l = (w0 & 0xffff) | (w1 << 16);
     dst.h = (w2 & 0xffff) | (w3 << 16);
  }

  //Same, except with 4 addends. Works faster than adding them one by one.
  function int64add4(dst, a, b, c, d)
  {
     var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
     var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
     var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
     var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
     dst.l = (w0 & 0xffff) | (w1 << 16);
     dst.h = (w2 & 0xffff) | (w3 << 16);
  }

  //Same, except with 5 addends
  function int64add5(dst, a, b, c, d, e)
  {
     var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff);
     var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16);
     var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16);
     var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
     dst.l = (w0 & 0xffff) | (w1 << 16);
     dst.h = (w2 & 0xffff) | (w3 << 16);
  } */
  
  i64: function(h,l){
    return ThothSC.Integer64.create({ h: h, l: l});
  }
  
});

ThothSC.Integer64 = SC.Object.extend({
  h: undefined,
  l: undefined,

  //Adds two 64-bit numbers
  //Like the original implementation, does not rely on 32-bit operations
  // accepts any number of args
  add: function(){ 
    // this can be clever ...
    var args = arguments, args_len = args.length;
    var i;
    var w0 = (this.l & 0xffff);
    var w1 = (this.l >>> 16);
    var w2 = (this.h & 0xffff);
    var w3 = (this.h >>> 16);

    for(i=0;i<args_len;i+=1){
      w0 += (args[i].l & 0xffff);
      w1 += (args[i].l >>> 16);
      w2 += (args[i].h & 0xffff);
      w3 += (args[i].h >>> 16);
    }
    
    w1 += (w0 >>> 16);
    w2 += (w1 >>> 16);
    w3 += (w2 >>> 16);

    this.l = (w0 & 0xffff) | (w1 << 16);
    this.h = (w2 & 0xffff) | (w3 << 16);
    return this;
  },

  copy: function(){
    //Copies src into dst, assuming both are 64-bit numbers
    var ret = {};
    ret.h = this.get('h');
    ret.l = this.get('l');
    return ThothSC.Integer64.create(ret);
  },
  
  rrot: function(shift){
    var l = this.l; 
    var h = this.h;
    return ThothSC.Integer64.create({
      l: (l >>> shift) | (h << (32-shift)),
      h: (h >>> shift) | (l << (32-shift))
    });    
  },

  revrrot: function(shift){
    var l = this.l; 
    var h = this.h;
    return ThothSC.Integer64.create({
      l: (h >>> shift) | (l << (32-shift)),
      h: (l >>> shift) | (h << (32-shift)) 
    });
  },

  //Bitwise-shifts right a 64-bit number by shift
  //Won't handle shift>=32, but it's never needed in SHA512
  shr: function(shift){
    var l = this.l;
    var h = this.h;
    return ThothSC.Integer64.create({
      l: (l >>> shift) | (h << (32-shift)),
      h: (h >>> shift)
    });
  }
});

/*
ThothSC.Integer64test = function(){
  var int64 = function(h, l){
    this.h = h;
    this.l = l;
    //this.toString = int64toString;
  };

  //Copies src into dst, assuming both are 64-bit numbers
  var int64copy = function(dst, src){
    dst.h = src.h;
    dst.l = src.l;
  };

  //Right-rotates a 64-bit number by shift
  //Won't handle cases of shift>=32
  //The function revrrot() is for that
  var int64rrot = function(dst, x, shift){
    dst.l = (x.l >>> shift) | (x.h << (32-shift));
    dst.h = (x.h >>> shift) | (x.l << (32-shift));
  };

  //Reverses the dwords of the source and then rotates right by shift.
  //This is equivalent to rotation by 32+shift
  var int64revrrot = function(dst, x, shift){
    dst.l = (x.h >>> shift) | (x.l << (32-shift));
    dst.h = (x.l >>> shift) | (x.h << (32-shift));
  };

  //Bitwise-shifts right a 64-bit number by shift
  //Won't handle shift>=32, but it's never needed in SHA512
  var int64shr = function(dst, x, shift){
    dst.l = (x.l >>> shift) | (x.h << (32-shift));
    dst.h = (x.h >>> shift);
  };

  //Adds two 64-bit numbers
  //Like the original implementation, does not rely on 32-bit operations
  var int64add = function(dst, x, y){
    var w0 = (x.l & 0xffff) + (y.l & 0xffff);
    var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
    var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
    var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
    console.log('ORIG add: values before assigning: w0,w1,w2,w3: ' + [w0,w1,w2,w3].join(","));
    
    dst.l = (w0 & 0xffff) | (w1 << 16);
    dst.h = (w2 & 0xffff) | (w3 << 16);
  };

  //Same, except with 4 addends. Works faster than adding them one by one.
  var int64add4 = function(dst, a, b, c, d){
    var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
    var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
    var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
    var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
    console.log('ORIG add4: values before assigning: w0,w1,w2,w3: ' + [w0,w1,w2,w3].join(","));
    dst.l = (w0 & 0xffff) | (w1 << 16);
    dst.h = (w2 & 0xffff) | (w3 << 16);
  };

  //Same, except with 5 addends
  var int64add5 = function(dst, a, b, c, d, e){
    var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff);
    var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16);
    var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16);
    var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
    console.log('ORIG add5: values before assigning: w0,w1,w2,w3: ' + [w0,w1,w2,w3].join(","));
    dst.l = (w0 & 0xffff) | (w1 << 16);
    dst.h = (w2 & 0xffff) | (w3 << 16);
  };
  
  var H = [new int64(0x6a09e667, -205731576),
      new int64(-1150833019, -2067093701),
      new int64(0x3c6ef372, -23791573),
      new int64(-1521486534, 0x5f1d36f1),
      new int64(0x510e527f, -1377402159),
      new int64(-1694144372, 0x2b3e6c1f),
      new int64(0x1f83d9ab, -79577749),
      new int64(0x5be0cd19, 0x137e2179)];
      
  var S = [];
  for(var i=0;i<H.length;i+=1){
    S[i] = ThothSC.Integer64.create(H[i]);
  }
  
  var orig,scver;
  
  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 1: content test');
  console.log('int64.h: ' + H[0].h + ', int64.l: ' + H[0].l);
  console.log('Integer64.h: ' + scver.h + ', Integer64.l: ' + scver.l);
  
  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 2: add single value');
  int64add(orig,H[0],H[1]);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver.add(S[1]);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l);
  
  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 3: add 4 values');
  int64add4(orig,H[0],H[1],H[2],H[3]);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver.add(S[1],S[2],S[3]);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l);


  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 4: add 5 values');
  int64add5(orig,H[0],H[1],H[2],H[3],H[4]);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver.add(S[1],S[2],S[3],S[4]);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l); 

  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 5: rrot');
  console.log('start values orig: l: ' + H[0].l + ", h: " + H[0].h);
  console.log('start values scver: l: ' + scver.l + ", h: " + scver.h);
  int64rrot(orig,H[0],7);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver = scver.rrot(7);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l);
 
  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 5: revrrot');
  int64revrrot(orig,H[0],7);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver = scver.revrrot(7);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l);  
  
  orig = new int64(0,0); scver = S[0].copy();
  console.log('test 6: shr');
  int64shr(orig,H[0],7);
  console.log('original: h: ' + orig.h + ", l: " + orig.l);
  scver = scver.shr(7);
  console.log('scver: h: ' + scver.h + ', l: ' + scver.l);  
}; */