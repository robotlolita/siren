// -- Mermaid's Runtime
void
function(root) {
  'use strict';

  // -- Helpers --------------------------------------------------------
  var protoOf = Object.getPrototypeOf;

  function nameOf(f) {
    return '<' + (f.name || 'anonymous-function') + '#' + f.length + '>'
  }
  
  function checkArity(f, n) {
    if (f.length !== n) {
      throw new RangeError('Wrong number of arguments (' + n + ') provided for ' + nameOf(f) )
    }
  }

  function checkRange(min, max, n) {
    if (n < min || n > max) {
      throw new RangeError("Index " + n + " out of bounds " + min + "..." + max)
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

  function toObj(xs) {
    return xs.reduce(function(r, p) {
      r[p[0]] = p[1];
      return r
    }, Object.create(null))
  }
  
  function extendProto(p, rec) {
    methods.merge(extendObj(p, rec));
  }

  function extendObj(o, rec) {
    var syms = Object.keys(rec).map(function(k) {
      var selector = Symbol(k);
      o[selector] = rec[k];
      return [k, selector]
    });

    return [o, toObj(syms)];
  }

  function makeObj(o, proto) {
    var result = Object.create(proto || Object.prototype);
    methods.merge(extendObj(result, o));
    return result
  }

  // -- Method box -----------------------------------------------------
  function MethodBox(parent) {
    this.parent = parent;
    this.methods = new WeakMap();
  }
  MethodBox.prototype.set = function(p, v) {
    this.methods.set(p, v);
  };
  MethodBox.prototype.get = function(p) {
    return this.methods.get(p) || {};
  };
  MethodBox.prototype.lookup = function(p, k) {
    if (p == null)  return null;
    
    var box = this.get(p);
    if (box) {
      var selector = box[k];
      if (selector)  return selector;
    }
    if (this.parent) {
      var selector = this.parent.lookup(p, k);
      if (selector)  return selector;
    }
    return this.lookup(protoOf(p), k);
  };
  MethodBox.prototype.clone = function() {
    return new MethodBox(this);
  };
  MethodBox.prototype.merge = function() {
    [].forEach.call(arguments, function(pair) {
      var proto = pair[0];
      var mappings = pair[1];
      var box = this.get(proto);
      extend(box, mappings);
      this.set(proto, box);
    }.bind(this));
  };

  var methods = new MethodBox();
  var messageNotUnderstood = Symbol('does-not-understand:');
  var send = Symbol('send:in:args:');
  methods.set(Object.prototype, {
    'does-not-understand:': messageNotUnderstood,
    '$send:in:args:': send
  });
  var $meta = new WeakMap();
  

  // -- Objects --------------------------------------------------------
  Object.prototype[messageNotUnderstood] = function(s, v) {
    throw new Error(this + " does not understand " + s);
  };
  Object.prototype[send] = function(message, methods, args) {
    var selector = methods.lookup(Object(this), message);
    if (selector) {
      switch (args.length) {
        case 0: return this[selector]();
        case 1: return this[selector](args[0]);
        case 2: return this[selector](args[0], args[1]);
        case 3: return this[selector](args[0], args[1], args[2]);
        default: return this[selector].apply(this, args);
      }
    } else {
      return this[messageNotUnderstood](message, args);
    }
  }
  extendProto(Object.prototype, {
    'clone:': function(v) {
      return makeObj(v, this)
    }
  });
          

  extendProto(Function.prototype, {
    'value': function() {
      checkArity(this, 0);
      return this();
    },
    'call:': function(a) {
      checkArity(this, 1);
      return this(a);
    },
    'call:with:': function(a, b) {
      checkArity(this, 2);
      return this(a, b);
    },
    'call:with:with:': function(a, b, c) {
      checkArity(this, 3);
      return this(a, b, c);
    },
    'call:with:with:with:': function(a, b, c, d) {
      checkArity(this, 4);
      return this(a, b, c, d);
    },
    'call:with:with:with:with:': function(a, b, c, d, e) {
      checkArity(this, 5);
      return this(a, b, c, d, e);
    },
    'call:with:with:with:with:with:': function(a, b, c, d, e, f) {
      checkArity(this, 6);
      return this(a, b, c, d, e, f);
    },
    'call:with:with:with:with:with:with:': function(a, b, c, d, e, f, g) {
      checkArity(this, 7);
      return this(a, b, c, d, e, f, g);
    },
    'call:with:with:with:with:with:with:with:': function(a, b, c, d, e, f, g, h) {
      checkArity(this, 8);
      return this(a, b, c, d, e, f, g, h);
    },
    'call:with:with:with:with:with:with:with:with:': function(a, b, c, d, e, f, g, h, i) {
      checkArity(this, 9);
      return this(a, b, c, d, e, f, g, h, i);
    },
    'apply:': function(xs) {
      checkArity(this, xs.length);
      return this.apply(null, xs);
    }
  });


  extendProto(Number.prototype, {
    '+': function(b) {
      checkClass('Number', b);
      return this + b;
    },
    '-': function(b) {
      checkClass('Number', b);
      return this - b;
    },
    '*': function(b) {
      checkClass('Number', b);
      return this * b;
    },
    '/': function(b) {
      checkClass('Number', b);
      return this / b;
    },
    'modulus:': function(b) {
      checkClass('Number', b);
      return this % b;
    },
    '===': function(b) {
      return this.valueOf() === b.valueOf();
    },
    '=/=': function(b) {
      return this.valueOf() === b.valueOf()
    },
    '>': function(b) {
      checkClass('Number', b);
      return this > b;
    },
    '<': function(b) {
      checkClass('Number', b);
      return this < b;
    },
    '>=': function(b) {
      checkClass('Number', b);
      return this >= b;
    },
    '<=': function(b) {
      checkClass('Number', b);
      return this <= b;
    },
    'bit-shift-right:': function(b) {
      checkClass('Number', b);
      return this >> b;
    },
    'bit-shift-left:': function(b) {
      checkClass('Number', b);
      return this << b;
    },
    'unsigned-bit-shift-right:': function(b) {
      checkClass('Number', b);
      return this >>> b;
    },
    'bit-or:': function(b) {
      checkClass('Number', b);
      return this | b;
    },
    'bit-and:': function(b) {
      checkClass('Number', b);
      return this & b;
    },
    'bit-xor:': function(b) {
      checkClass('Number', b);
      return this ^ b;
    }
  });
  

  extendProto(Boolean.prototype, {
    '&&': function(b) {
      checkClass('Boolean', b);
      return this && b;
    },
    '||': function(b) {
      checkClass('Boolean', b);
      return this || b;
    },
    '===': function(b) {
      return this.valueOf() === b.valueOf()
    },
    '=/=': function(b) {
      return this.valueOf() !== b.valueOf()
    },
    'then:else:': function(f, g) {
      if (this == true) {
        return f[send]('value', methods, [])
      } else {
        return g[send]('value', methods, [])
      }
    }
  });

  extendProto(String.prototype, {
    '===': function(b) {
      return this.valueOf() === b.valueOf()
    },
    '=/=': function(b) {
      return this.valueOf() === b.valueOf()
    },
    '+': function(b) {
      checkClass('String', b);
      return this + b;
    },
    'starts-with?:': function(b) {
      checkClass('String', b);
      return this.slice(0, b.length) === b.valueOf();
    },
    'ends-with?:': function(b) {
      checkClass('String', b);
      return this.slice(-b.length) === b.valueOf();
    },
    'slice-from:to:': function(k, i) {
      checkClass('Number', k);
      checkClass('Number', i);
      return this.slice(k, i);
    },
    'slice-from:': function(k) {
      checkClass('Number', k);
      return this.slice(k);
    },
    'trim': function() {
      return this.trim();
    },
    'trim-left': function() {
      return this.trimLeft();
    },
    'trim-right': function() {
      return this.trimRight();
    }
  });

  extendProto(Array.prototype, {
    '+': function(b) {
      checkClass('Array', b);
      return this.concat(b);
    },
    'at:': function(k) {
      checkRange(1, this.length, k);
      return this[k - 1];
    },
    'at:put:': function(k, v) {
      checkRange(1, this.length, k);
      this[k - 1] = v;
      return this;
    },
    'map:': function(f) {
      var res = [];
      for (var i = 0; i < this.length; ++i)
        res[i] = f[send]('call:', methods, this[i]);
      return res
    },
    'each:': function(f) {
      var res = [];
      for (var i = 0; i < this.length; ++i)
        f[send]('call:', methods, this[i]);
      return this;
    }
  });

  // -- Global stuff ---------------------------------------------------
  root.Mermaid = {
    '$module:': function(req, dir, mod) {
      return {
        'require:': function(p){ return req(p) },
        'dirname': function(){ return dir },
        'filename': function(){ return mod.filename }
      }
    },
    '$methods': methods,
    '$meta': $meta,
    '$extend': extendObj,
    '$send': send,
    '$make': makeObj
  }

}( typeof global !== 'undefined'? global
 : typeof window !== 'undefined'? window
 : /* otherwise */                this);
// -- Mermaid's Runtime ends here
