/*globals ThothSC */

sc_require('lib/crypto/basic_crypto');

ThothSC.CryptoSHA512 = ThothSC.Crypto.create({
  vm_test: function(){
    return this.hex("abc").toLowerCase() == "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
    "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";
  },
  
  rstr: function(s){
    return this.binb2rstr(this.binb(this.rstr2binb(s), s.length * 8));
  },
  
  //Calculate the HMAC-SHA1 of a key and some data (raw strings)
  rstr_hmac: function(key,data){
    var bkey = this.rstr2binb(key), hash,i,
        ipad = [], opad = [];
    
    if(bkey.length > 32) bkey = this.binb(bkey, key.length * 8);

    for(i=0;i<32;i+=1){
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

    hash = this.binb(ipad.concat(this.rstr2binb(data)), 1024 + data.length * 8);
    return this.binb2rstr(this.binb(opad.concat(hash), 1024 + 512));
  },
      
  k: null,
  
  binb: function(x,len){
    if(!this.k){
       this.k = [
        this.i64(0x428a2f98, -685199838), this.i64(0x71374491, 0x23ef65cd),
        this.i64(-1245643825, -330482897), this.i64(-373957723, -2121671748),
        this.i64(0x3956c25b, -213338824), this.i64(0x59f111f1, -1241133031),
        this.i64(-1841331548, -1357295717), this.i64(-1424204075, -630357736),
        this.i64(-670586216, -1560083902), this.i64(0x12835b01, 0x45706fbe),
        this.i64(0x243185be, 0x4ee4b28c), this.i64(0x550c7dc3, -704662302),
        this.i64(0x72be5d74, -226784913), this.i64(-2132889090, 0x3b1696b1),
        this.i64(-1680079193, 0x25c71235), this.i64(-1046744716, -815192428),
        this.i64(-459576895, -1628353838), this.i64(-272742522, 0x384f25e3),
        this.i64(0xfc19dc6, -1953704523), this.i64(0x240ca1cc, 0x77ac9c65),
        this.i64(0x2de92c6f, 0x592b0275), this.i64(0x4a7484aa, 0x6ea6e483),
        this.i64(0x5cb0a9dc, -1119749164), this.i64(0x76f988da, -2096016459),
        this.i64(-1740746414, -295247957), this.i64(-1473132947, 0x2db43210),
        this.i64(-1341970488, -1728372417), this.i64(-1084653625, -1091629340),
        this.i64(-958395405, 0x3da88fc2), this.i64(-710438585, -1828018395),
        this.i64(0x6ca6351, -536640913), this.i64(0x14292967, 0xa0e6e70),
        this.i64(0x27b70a85, 0x46d22ffc), this.i64(0x2e1b2138, 0x5c26c926),
        this.i64(0x4d2c6dfc, 0x5ac42aed), this.i64(0x53380d13, -1651133473),
        this.i64(0x650a7354, -1951439906), this.i64(0x766a0abb, 0x3c77b2a8),
        this.i64(-2117940946, 0x47edaee6), this.i64(-1838011259, 0x1482353b),
        this.i64(-1564481375, 0x4cf10364), this.i64(-1474664885, -1136513023),
        this.i64(-1035236496, -789014639), this.i64(-949202525, 0x654be30),
        this.i64(-778901479, -688958952), this.i64(-694614492, 0x5565a910),
        this.i64(-200395387, 0x5771202a), this.i64(0x106aa070, 0x32bbd1b8),
        this.i64(0x19a4c116, -1194143544), this.i64(0x1e376c08, 0x5141ab53),
        this.i64(0x2748774c, -544281703), this.i64(0x34b0bcb5, -509917016),
        this.i64(0x391c0cb3, -976659869), this.i64(0x4ed8aa4a, -482243893),
        this.i64(0x5b9cca4f, 0x7763e373), this.i64(0x682e6ff3, -692930397),
        this.i64(0x748f82ee, 0x5defb2fc), this.i64(0x78a5636f, 0x43172f60),
        this.i64(-2067236844, -1578062990), this.i64(-1933114872, 0x1a6439ec),
        this.i64(-1866530822, 0x23631e28), this.i64(-1538233109, -561857047),
        this.i64(-1090935817, -1295615723), this.i64(-965641998, -479046869),
        this.i64(-903397682, -366583396), this.i64(-779700025, 0x21c0c207),
        this.i64(-354779690, -840897762), this.i64(-176337025, -294727304),
        this.i64(0x6f067aa, 0x72176fba), this.i64(0xa637dc5, -1563912026),
        this.i64(0x113f9804, -1090974290), this.i64(0x1b710b35, 0x131c471b),
        this.i64(0x28db77f5, 0x23047d84), this.i64(0x32caab7b, 0x40c72493),
        this.i64(0x3c9ebe0a, 0x15c9bebc), this.i64(0x431d67c4, -1676669620),
        this.i64(0x4cc5d4be, -885112138), this.i64(0x597f299c, -60457430),
        this.i64(0x5fcb6fab, 0x3ad6faec), this.i64(0x6c44198c, 0x4a475817)];
      }
    
    var H = [this.i64(0x6a09e667, -205731576),
        this.i64(-1150833019, -2067093701),
        this.i64(0x3c6ef372, -23791573),
        this.i64(-1521486534, 0x5f1d36f1),
        this.i64(0x510e527f, -1377402159),
        this.i64(-1694144372, 0x2b3e6c1f),
        this.i64(0x1f83d9ab, -79577749),
        this.i64(0x5be0cd19, 0x137e2179)];
      
    var T1 = this.i64(0, 0),
        T2 = this.i64(0, 0),
        a = this.i64(0,0),
        b = this.i64(0,0),
        c = this.i64(0,0),
        d = this.i64(0,0),
        e = this.i64(0,0),
        f = this.i64(0,0),
        g = this.i64(0,0),
        h = this.i64(0,0),
        //Temporary variables not specified by the document
        s0 = this.i64(0, 0),
        s1 = this.i64(0, 0),
        Ch = this.i64(0, 0),
        Maj = this.i64(0, 0),
        r1 = this.i64(0, 0),
        r2 = this.i64(0, 0),
        r3 = this.i64(0, 0);
    var j, i, W = [], x_len, hash = [];
    
    for(i=0; i<80; i++){
      W[i] = this.i64(0, 0);
    }
    // append padding to the source string. The format is described in the FIPS.
    x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
    x[((len + 128 >> 10)<< 5) + 31] = len;
    
    x_len = x.length;
    //32 dwords is the block size
    for(i = 0; i<x_len; i+=32){
      a = H[0].copy();
      b = H[1].copy();
      c = H[2].copy();
      d = H[3].copy();
      e = H[4].copy();
      f = H[5].copy();
      g = H[6].copy();
      h = H[7].copy();

      for(j=0; j<16; j+=1){
          W[j].h = x[i + 2*j];
          W[j].l = x[i + 2*j + 1];
      }

      for(j=16; j<80; j+=1){
        //sigma1
        r1 = W[j-2].rrot(19);
        r2 = W[j-2].revrrot(29);
        r3 = W[j-2].shr(6);
        s1.l = r1.l ^ r2.l ^ r3.l;
        s1.h = r1.h ^ r2.h ^ r3.h;
        //sigma0
        r1 = W[j-15].rrot(1);
        r2 = W[j-15].rrot(8);
        r3 = W[j-15].shr(7);
        s0.l = r1.l ^ r2.l ^ r3.l;
        s0.h = r1.h ^ r2.h ^ r3.h;

        W[j] = this.i64(0,0).add(s1,W[j-7],s0,W[j-16]);
      }

      for(j = 0; j < 80; j++)
      {
        //Ch
        Ch.l = (e.l & f.l) ^ (~e.l & g.l);
        Ch.h = (e.h & f.h) ^ (~e.h & g.h);

        //Sigma1
        r1 = e.rrot(14);
        r2 = e.rrot(18);
        r3 = e.revrrot(9);
        s1.l = r1.l ^ r2.l ^ r3.l;
        s1.h = r1.h ^ r2.h ^ r3.h;

        //Sigma0
        r1 = a.rrot(28);
        r2 = a.revrrot(2);
        r3 = a.revrrot(7);
        s0.l = r1.l ^ r2.l ^ r3.l;
        s0.h = r1.h ^ r2.h ^ r3.h;

        //Maj
        Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
        Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);

        T1 = this.i64(0,0).add(h, s1, Ch, this.k[j], W[j]);
        T2 = this.i64(0,0).add(s0, Maj);

        h = g.copy();
        g = f.copy();
        f = e.copy();
        e = this.i64(0,0).add(d,T1);
        d = c.copy();
        c = b.copy();
        b = a.copy();
        a = this.i64(0,0).add(T1,T2);
      }
      H[0].add(a);
      H[1].add(b);
      H[2].add(c);
      H[3].add(d);
      H[4].add(e);
      H[5].add(f);
      H[6].add(g);
      H[7].add(h);
    }

    //represent the hash as an array of 32-bit dwords
    for(i=0; i<8; i++){
      hash[2*i] = H[i].h;
      hash[2*i + 1] = H[i].l;
    }
    return hash;
  }
  
});

/*var sha512_k;
function binb_sha512(x, len)
{
  if(sha512_k == undefined)
  {
    //SHA512 constants
    sha512_k = new Array(
this.i64(0x428a2f98, -685199838), this.i64(0x71374491, 0x23ef65cd),
this.i64(-1245643825, -330482897), this.i64(-373957723, -2121671748),
this.i64(0x3956c25b, -213338824), this.i64(0x59f111f1, -1241133031),
this.i64(-1841331548, -1357295717), this.i64(-1424204075, -630357736),
this.i64(-670586216, -1560083902), this.i64(0x12835b01, 0x45706fbe),
this.i64(0x243185be, 0x4ee4b28c), this.i64(0x550c7dc3, -704662302),
this.i64(0x72be5d74, -226784913), this.i64(-2132889090, 0x3b1696b1),
this.i64(-1680079193, 0x25c71235), this.i64(-1046744716, -815192428),
this.i64(-459576895, -1628353838), this.i64(-272742522, 0x384f25e3),
this.i64(0xfc19dc6, -1953704523), this.i64(0x240ca1cc, 0x77ac9c65),
this.i64(0x2de92c6f, 0x592b0275), this.i64(0x4a7484aa, 0x6ea6e483),
this.i64(0x5cb0a9dc, -1119749164), this.i64(0x76f988da, -2096016459),
this.i64(-1740746414, -295247957), this.i64(-1473132947, 0x2db43210),
this.i64(-1341970488, -1728372417), this.i64(-1084653625, -1091629340),
this.i64(-958395405, 0x3da88fc2), this.i64(-710438585, -1828018395),
this.i64(0x6ca6351, -536640913), this.i64(0x14292967, 0xa0e6e70),
this.i64(0x27b70a85, 0x46d22ffc), this.i64(0x2e1b2138, 0x5c26c926),
this.i64(0x4d2c6dfc, 0x5ac42aed), this.i64(0x53380d13, -1651133473),
this.i64(0x650a7354, -1951439906), this.i64(0x766a0abb, 0x3c77b2a8),
this.i64(-2117940946, 0x47edaee6), this.i64(-1838011259, 0x1482353b),
this.i64(-1564481375, 0x4cf10364), this.i64(-1474664885, -1136513023),
this.i64(-1035236496, -789014639), this.i64(-949202525, 0x654be30),
this.i64(-778901479, -688958952), this.i64(-694614492, 0x5565a910),
this.i64(-200395387, 0x5771202a), this.i64(0x106aa070, 0x32bbd1b8),
this.i64(0x19a4c116, -1194143544), this.i64(0x1e376c08, 0x5141ab53),
this.i64(0x2748774c, -544281703), this.i64(0x34b0bcb5, -509917016),
this.i64(0x391c0cb3, -976659869), this.i64(0x4ed8aa4a, -482243893),
this.i64(0x5b9cca4f, 0x7763e373), this.i64(0x682e6ff3, -692930397),
this.i64(0x748f82ee, 0x5defb2fc), this.i64(0x78a5636f, 0x43172f60),
this.i64(-2067236844, -1578062990), this.i64(-1933114872, 0x1a6439ec),
this.i64(-1866530822, 0x23631e28), this.i64(-1538233109, -561857047),
this.i64(-1090935817, -1295615723), this.i64(-965641998, -479046869),
this.i64(-903397682, -366583396), this.i64(-779700025, 0x21c0c207),
this.i64(-354779690, -840897762), this.i64(-176337025, -294727304),
this.i64(0x6f067aa, 0x72176fba), this.i64(0xa637dc5, -1563912026),
this.i64(0x113f9804, -1090974290), this.i64(0x1b710b35, 0x131c471b),
this.i64(0x28db77f5, 0x23047d84), this.i64(0x32caab7b, 0x40c72493),
this.i64(0x3c9ebe0a, 0x15c9bebc), this.i64(0x431d67c4, -1676669620),
this.i64(0x4cc5d4be, -885112138), this.i64(0x597f299c, -60457430),
this.i64(0x5fcb6fab, 0x3ad6faec), this.i64(0x6c44198c, 0x4a475817));
  }

  //Initial hash values
  var H = new Array(
this.i64(0x6a09e667, -205731576),
this.i64(-1150833019, -2067093701),
this.i64(0x3c6ef372, -23791573),
this.i64(-1521486534, 0x5f1d36f1),
this.i64(0x510e527f, -1377402159),
this.i64(-1694144372, 0x2b3e6c1f),
this.i64(0x1f83d9ab, -79577749),
this.i64(0x5be0cd19, 0x137e2179));

  var T1 = this.i64(0, 0),
    T2 = this.i64(0, 0),
    a = this.i64(0,0),
    b = this.i64(0,0),
    c = this.i64(0,0),
    d = this.i64(0,0),
    e = this.i64(0,0),
    f = this.i64(0,0),
    g = this.i64(0,0),
    h = this.i64(0,0),
    //Temporary variables not specified by the document
    s0 = this.i64(0, 0),
    s1 = this.i64(0, 0),
    Ch = this.i64(0, 0),
    Maj = this.i64(0, 0),
    r1 = this.i64(0, 0),
    r2 = this.i64(0, 0),
    r3 = this.i64(0, 0);
  var j, i;
  var W = new Array(80);
  for(i=0; i<80; i++)
    W[i] = this.i64(0, 0);

  // append padding to the source string. The format is described in the FIPS.
  x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
  x[((len + 128 >> 10)<< 5) + 31] = len;

  for(i = 0; i<x.length; i+=32) //32 dwords is the block size
  {
    int64copy(a, H[0]);
    int64copy(b, H[1]);
    int64copy(c, H[2]);
    int64copy(d, H[3]);
    int64copy(e, H[4]);
    int64copy(f, H[5]);
    int64copy(g, H[6]);
    int64copy(h, H[7]);

    for(j=0; j<16; j++)
    {
        W[j].h = x[i + 2*j];
        W[j].l = x[i + 2*j + 1];
    }

    for(j=16; j<80; j++)
    {
      //sigma1
      int64rrot(r1, W[j-2], 19);
      int64revrrot(r2, W[j-2], 29);
      int64shr(r3, W[j-2], 6);
      s1.l = r1.l ^ r2.l ^ r3.l;
      s1.h = r1.h ^ r2.h ^ r3.h;
      //sigma0
      int64rrot(r1, W[j-15], 1);
      int64rrot(r2, W[j-15], 8);
      int64shr(r3, W[j-15], 7);
      s0.l = r1.l ^ r2.l ^ r3.l;
      s0.h = r1.h ^ r2.h ^ r3.h;

      int64add4(W[j], s1, W[j-7], s0, W[j-16]);
    }

    for(j = 0; j < 80; j++)
    {
      //Ch
      Ch.l = (e.l & f.l) ^ (~e.l & g.l);
      Ch.h = (e.h & f.h) ^ (~e.h & g.h);

      //Sigma1
      int64rrot(r1, e, 14);
      int64rrot(r2, e, 18);
      int64revrrot(r3, e, 9);
      s1.l = r1.l ^ r2.l ^ r3.l;
      s1.h = r1.h ^ r2.h ^ r3.h;

      //Sigma0
      int64rrot(r1, a, 28);
      int64revrrot(r2, a, 2);
      int64revrrot(r3, a, 7);
      s0.l = r1.l ^ r2.l ^ r3.l;
      s0.h = r1.h ^ r2.h ^ r3.h;

      //Maj
      Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
      Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);

      int64add5(T1, h, s1, Ch, sha512_k[j], W[j]);
      int64add(T2, s0, Maj);

      int64copy(h, g);
      int64copy(g, f);
      int64copy(f, e);
      int64add(e, d, T1);
      int64copy(d, c);
      int64copy(c, b);
      int64copy(b, a);
      int64add(a, T1, T2);
    }
    int64add(H[0], H[0], a);
    int64add(H[1], H[1], b);
    int64add(H[2], H[2], c);
    int64add(H[3], H[3], d);
    int64add(H[4], H[4], e);
    int64add(H[5], H[5], f);
    int64add(H[6], H[6], g);
    int64add(H[7], H[7], h);
  }

  //represent the hash as an array of 32-bit dwords
  var hash = new Array(16);
  for(i=0; i<8; i++)
  {
    hash[2*i] = H[i].h;
    hash[2*i + 1] = H[i].l;
  }
  return hash;
}

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
