// -- Mermaid's Runtime
this.$Mermaid = function() {
  'use strict';

  // -- Helpers --------------------------------------------------------
  function nameOf(f) {
    return '<' + (f.name || 'anonymous-function') + '#' + f.length + '>'
  }
  
  function checkArity(f, n) {
    if (f.length !== n) {
      throw new RangeError('Wrong number of arguments (' + n + ') provided for ' + nameOf(f) )
    }
  }

  function checkRange(min, max, n) {
    if (n < min || n >= max) {
      throw new RangeError("Index " + n + " out of bounds " + min + ".." + max)
    }
  }

  function classOf(x) {
    return x === null?       'Null'
    :      x === undefined?  'Undefined'
    :      /* otherwise */   {}.toString.call(x).slice(8, -1);
  }
  
  function checkClass(c, x) {
    if (classOf(x) !== c) {
      throw new TypeError("Expected an object of type " + c + ", got " + classOf(x));
    }
  }

  function extend(a, b) {
    Object.keys(b).forEach(function(k){ a[k] = b[k] });
    return a;
  }
  
  // -- Objects --------------------------------------------------------
  var p = Object.prototype;
  p['clone:'] = function(v) {
    return extend(Object.create(this), v);
  };

  // -- Functions ------------------------------------------------------
  Function.prototype.value = function() {
    checkArity(this, 0);
    return this();
  };
  Function.prototype['call:'] = function(a) {
    checkArity(this, 1);
    return this(a);
  };
  Function.prototype['call:with:'] = function(a, b) {
    checkArity(this, 2);
    return this(a, b);
  };
  Function.prototype['call:with:with:'] = function(a, b, c) {
    checkArity(this, 3);
    return this(a, b, c);
  };
  Function.prototype['call:with:with:with:'] = function(a, b, c, d) {
    checkArity(this, 4);
    return this(a, b, c, d);
  };
  Function.prototype['apply-to:'] = function(xs) {
    checkArity(this, xs.length);
    return this.apply(null, xs);
  };

  // -- Number ---------------------------------------------------------
  var p = Number.prototype;
  p['+'] = function(b) {
    checkClass('Number', b);
    return this + b;
  };
  p['-'] = function(b) {
    checkClass('Number', b);
    return this - b;
  };
  p['*'] = function(b) {
    checkClass('Number', b);
    return this * b;
  };
  p['/'] = function(b) {
    checkClass('Number', b);
    return this / b;
  };
  p['modulus:'] = function(b) {
    checkClass('Number', b);
    return this % b;
  }
  p['==='] = function(b) {
    return this.valueOf() === b;
  };
  p['=/='] = function(b) {
    return this.valueOf() !== b;
  };
  p['>'] = function(b) {
    checkClass('Number', b);
    return this > b;
  };
  p['<'] = function(b) {
    checkClass('Number', b);
    return this < b;
  };
  p['<='] = function(b) {
    checkClass('Number', b);
    return this <= b;
  };
  p['>='] = function(b) {
    checkClass('Number', b);
    return this >= b;
  };
  p['bit-shift-right:'] = function(b) {
    checkClass('Number', b);
    return this >> b;
  };
  p['bit-shift-left:'] = function(b) {
    checkClass('Number', b);
    return this << b;
  };
  p['unsigned-bit-shift-right:'] = function(b) {
    checkClass('Number', b);
    return this >>> b;
  };
  p['bit-or:'] = function(b) {
    checkClass('Number', b);
    return this | b;
  };
  p['bit-and:'] = function(b) {
    checkClass('Number', b);
    return this & b;
  };
  p['bit-xor:'] = function(b) {
    checkClass('Number', b);
    return this ^ b;
  };

  // -- Boolean --------------------------------------------------------
  var p = Boolean.prototype;
  p['&&'] = function(b) {
    checkClass('Boolean', b);
    return this && b;
  };
  p['||'] = function(b) {
    checkClass('Boolean', b);
    return this || b;
  };
  p['==='] = function(b) {
    return this.valueOf() === b;
  };
  p['=/='] = function(b) {
    return this.valueOf() !== b;
  };
  p['then:else:'] = function(f, g) {
    if (this == true) {
      return f['value']();
    } else {
      return g['value']();
    }
  };

  // -- String ---------------------------------------------------------
  var p = String.prototype;
  p['==='] = function(b) {
    return this.valueOf() === b;
  };
  p['=/='] = function(b) {
    return this.valueOf() !== b;
  };


  // -- Array ----------------------------------------------------------
  var p = Array.prototype;
  p['at:'] = function(n) {
    checkRange(0, this.length, n);
    return this[n];
  };
  p['at:put:'] = function(n, v) {
    checkRange(0, this.length, n);
    this[n] = v;
    return this;
  };
  p['map:'] = function(f) {
    var res = [];
    for (var i = 0; i < this.length; ++i)
      res[i] = f['call:'](this[i]);
    return res;
  };
  p['each:'] = function(f) {
    for (var i = 0; i < this.length; ++i)
      f['call:'](this[i]);
    return this;
  };
  p['reduce:from:'] = function(f, v) {
    for (var i = 0; i < this.length; ++i)
      v = f['call:with:'](v, this[i]);
    return v;
  };
  p['reduce:'] = function(f) {
    if (this.length < 1)
      throw new Error("`reduce:` can only be used for Arrays with at least one element. Use `reduce:from:` for possibly empty arrays.");

    var v = this[this.length - 1];
    for (var i = 0; i < this.length - 1; ++i)
      v = f['call:with:'](v, this[i]);
    return v;
  };
  p['some:'] = function(f) {
    for (var i = 0; i < this.length; ++i)
      if (f['call:'](this[i]))  return true;
    return false;
  };
  p['every:'] = function(f) {
    for (var i = 0; i < this.length; ++i)
      if (!f['call:'](this[i]))  return false;
    return true;
  };

  // -- Global stuff ---------------------------------------------------
  return {
    '$module:': function(req, dir, mod) {
      return {
        'require:': function(p){ return req(p) },
        'dirname': function(){ return dir },
        'filename': function(){ return mod.filename }
      }
    }
  }

}.call(this);
// -- Mermaid's Runtime ends here
