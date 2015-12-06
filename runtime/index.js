var _moduleContext = this;

module.exports = function() {
  'use strict';

  // -- Dependencies ---------------------------------------------------
  var path = require('path');
  var fs = require('fs');
  var BigNum = require('bignum');
  var isNumberP = require('is-number-object');
  var isStringP = require('is-string');
  var isBooleanP = require('is-boolean-object');

  // -- Aliases --------------------------------------------------------
  var prototypeOf = Object.getPrototypeOf;
  var keys = Object.keys;
  var internalClassOf = Object.prototype.toString;
  var globalObject = typeof window !== 'undefined'?  window
                   : typeof global !== 'undefined'?  global
                   : /* otherwise */                 _moduleContext

  // -- Helpers --------------------------------------------------------

  // ### function: nameOf(f)
  // Tries to guess the name of a function.
  //
  // @type: (Function) -> String
  function nameOf(f) {
    return '<' + (f.displayName || f.name || 'anonymous-function') + '#' + f.length + '>';
  }

  // ### function: extend(a, b)
  // Copies all own enumerable properties of `b` to `a`.
  //
  // @type: (Object, Object) -> Object
  function extend(a, b) {
    keys(b).forEach(function(k){ a[k] = b[k] });
    return a;
  }


  // Type checkers
  function assert_arity(f, n) {
    if (f.length !== n) {
      throw new RangeError('Wrong number of arguments (' + n + ') provided for ' + nameOf(f) );
    }
  }

  function assert_number(a) {
    if (internalClassOf.call(a) !== '[object Number]')
      throw new TypeError('Not a Float.');
  }

  function assert_bigint(a) {
    if (!BigNum.isBigNum(a)) {
      throw new TypeError('Not an Integer.')
    }
  }

  function assert_function(a) {
    if (typeof a !== 'function')
      throw new TypeError('Not a function.');
  }

  function assert_string(a) {
    if (internalClassOf.call(a) !== '[object String]')
      throw new TypeError('Not a string.');
  }

  function assert_array(a) {
    if (!Array.isArray(a))
      throw new TypeError('Not an array.');
  }

  function assert_exists(object, key) {
    if (!(key in object))
      throw new TypeError(key + ' does not exist in Object.');
  }

  function isNumber(a) {
    return internalClassOf.call(a) === '[object Number]';
  }

  function isString(a) {
    return internalClassOf.call(a) === '[object String]';
  }

  function isFunction(a) {
    return typeof a === 'function';
  }

  function isPrimitiveP(a) {
    return isNumberP(a)
        || isStringP(a)
        || isFunction(a);
  }

  function assert_bounds(n, min, max) {
    if (n < min || n > max) {
      throw new RangeError("Index " + n + " out of bounds " + min + "..." + max);
    }
  }

  // -- Message handling -----------------------------------------------

  // ### class: MethodBox()
  //
  // Provides scoped resolution of message names to message selectors.
  //
  // Messages in Siren are stored in each object as unique selector
  // values. To translate a name such as `+` or `add:to:` it uses a
  // `MethodBox` object available in that scope, which provides the
  // mapping of names to selector values.
  //
  // @type: new (MethodBox | null)
  function MethodBox(parent) {
    this.parent = parent;
    this.methods = new WeakMap();
  }

  // #### method: set(object, value)
  // Adds a new mapping to the given object.
  //
  // @type: (Object, { String -> Symbol }) -> Unit
  MethodBox.prototype.set = function(object, value) {
    this.methods.set(object, value);
  };

  // #### method: get(object)
  // Returns the mapping for the given object.
  //
  // @type: Object -> { String -> Symbol }
  MethodBox.prototype.get = function(object) {
    return this.methods.get(object);
  };

  // #### method: lookup(object, name)
  // Retrieves the selector value for the object / name pair provided.
  // Looks up in the whole prototype chain of the object before falling
  // back to the parent (MethodBox) scope.
  //
  // @type: (Object, String) -> Symbol | null
  MethodBox.prototype.lookup = function(object, name) {
    if (object == null)  return null;

    var box = this.get(object);
    if (box) {
      var selector = box[name];
      if (selector)  return selector;
    }
    if (this.parent) {
      var selector = this.parent.lookup(object, name);
      if (selector)  return selector;
    }
    return this.lookup(prototypeOf(object), name);
  };

  // #### method: list(object)
  // Returns a dictionary containing all translations of name -> selector value
  // for the given object in this box (and any of its parents).
  //
  // @type: Object -> { String -> Symbol }
  MethodBox.prototype.list = function(object) {
    if (object == null)  return {};

    var methods = extend({}, this.get(object) || {});
    if (this.parent)  extend(methods, this.parent.list(object));
    extend(methods, this.list(prototypeOf(object)));
    return methods;
  };

  // #### method: clone()
  // Returns a new MethodBox that inherits the mappings of this one.
  //
  // @type: () -> MethodBox
  MethodBox.prototype.clone = function() {
    return new MethodBox(this);
  };

  // #### method: merge(...traits)
  // Adds a series of traits to the mappings in this method box.
  //
  // @type: (...(Object, { String -> Symbol })) -> Unit
  MethodBox.prototype.merge = function() {
    [].forEach.call(arguments, function(pair) {
      var proto = pair[0];
      var mappings = pair[1];
      var box = this.get(proto) || {};
      extend(box, mappings);
      this.set(proto, box);
    }.bind(this));
  };

  // -- Meta-data handling ---------------------------------------------

  // ### class: Meta()
  //
  // Every object in Siren can contain meta-data about itself,
  // this meta-data lives in a separate object. The `Meta` object
  // holds mappings of Object to a dictionary of meta-data.
  function Meta() {
    this.data = new WeakMap();
  }

  // #### method: get(object, name)
  // Retrieves a meta-data property from the object.
  //
  // @type: (Object, String) -> Siren.Object | null
  Meta.prototype.get = function(object, name) {
    return (this.data.get(object) || {})[name];
  };

  // #### method: set(object, name, value)
  // Defines a new meta-data for the object.
  //
  // @type: (Object, String, Siren.Object) -> Unit
  Meta.prototype.set = function(object, name, value) {
    var metas = this.data.get(object) || {};
    metas[name] = value;
    this.data.set(object, metas);
  };

  // -- VM primitives --------------------------------------------------

  // --- Messages ------------------------------------------------------
  // #### function: $send(object, message, method, args)
  // Sends a message to an object.
  //
  // @type: (Siren.Object, String, MethodBox, [Siren.Object]) -> Siren.Object
  function $send(object, message, methods, args) {
    var selector = methods.lookup(Object(object), message);
    if (selector) {
      switch (args.length) {
        case 0: return object[selector]();
        case 1: return object[selector](args[0]);
        case 2: return object[selector](args[0], args[1]);
        case 3: return object[selector](args[0], args[1], args[2]);
        default: return object[selector].apply(object, args);
      }
    } else {
      console.log('>>', message, " <> ", args);
      var recoverSelector = methods.lookup(Object(object), 'does-not-understand:with-arguments:');
      if (recoverSelector && object[recoverSelector])
        return object[recoverSelector].call(object, message, args);
      else
        throw new Error('Failed to send ' + message);
    }
  };

  // --- Non-local returns ---------------------------------------------

  // #### class: Return()
  // Represents non-local returns.
  //
  // @type: new (Siren.Object)
  function Return(value) {
    this.value = value;
  }

  // #### function: $return(value)
  // Does a non-local return (can only be used inside blocks).
  //
  // @type: (Siren.Object) -> Unit :: throws Siren.Object
  function $return(value) {
    throw new Return(value);
  }

  // #### function: $handleReturn(value)
  // Handles non-local returns after the stack has been unwinded.
  // This accounts for the possibility of non-Return objects being
  // thrown by Siren code.
  //
  // @type: (Any) -> Siren.Object | Unit :: throws Object
  function $handleReturn(value) {
    if (value instanceof Return)
      return value.value;
    else
      throw value;
  }

  // --- Scoped extensions / traits ------------------------------------

  // #### function: pairsToObject(pairs)
  // Reifies a series of [selector, value] pairs into an Object.
  //
  // @type: [(Symbol, Siren.Object)] -> { Symbol -> Siren.Object }
  function pairsToObject(pairs) {
    return pairs.reduce(function(r, p) {
      r[p[0]] = p[1];
      return r;
    }, Object.create(null));
  }

  // #### function: $extendObject(object, record)
  // Extends a Siren object with properties coming from a plain JS object.
  //
  // @type: (Siren.Object, { String -> Siren.Object }) -> Siren.Object
  function $extendObject(object, record) {
    var pairs = keys(record).map(function(k) {
      var selector = Symbol(k);
      object[selector] = record[k];
      return [k, selector];
    });

    return [object, pairsToObject(pairs)];
  }

  // #### function: $makeObject(record, prototype)
  // Constructs a new Siren object, optionally with the given prototype.
  //
  // @type: ({ String -> Siren.Object}, Siren.Object | null) -> Siren.Object
  function $makeObject(record, prototype) {
    if (prototype === undefined) prototype = Base;
    var result = Object.create(prototype);
    $methods.merge($extendObject(result, record));
    return result;
  }

  // #### function: $makeFunction(fn, meta)
  // Constructs a function and assigns meta-data to it.
  //
  // @type: (Function, { String -> Siren.Object }) -> Function
  function $makeFunction(fn, meta) {
    meta = meta || {};
    if (meta.name) fn.displayName = meta.name;
    $meta.set(fn, meta);
    return fn;
  }

  // --- Importing / Exporting objects ---------------------------------
  // A symbol attached to objects that describes how they convert to JS
  var $export = Symbol('siren->js');
  var $import = Symbol('js->siren');

  // #### function: wrap(instance, namespace)
  // Wraps an object giving it a `send` method for interacting in the JS side.
  //
  // @type: (Siren.Object, MethodBox) -> Object
  function wrap(instance, namespace) {
    var wrapper = {
      send: function(message, args) {
        return wrap($send(instance, message, namespace, args), namespace);
      }
    };
    wrapper[$import] = function(){
      return instance;
    };
    return wrapper;
  }

  // --- Global instances ----------------------------------------------
  // The cache of modules that have been lazily loaded
  var moduleCache = Object.create(null);

  // The global method scope
  var $methods = new MethodBox();

  // The global meta-data mapping
  var $meta = new Meta();

  // The base object from which all Siren objects descend
  var Base = Object.create(Object.prototype);

  // A symbol for branding objects
  var Brand = Symbol('Brand');

  // --- Primitive operations ------------------------------------------
  var Primitives = $makeObject({
    'as-string': function() {
      return '<VM primitives>';
    },

    'does-not-understand:with-arguments:': function(message, args) {
      throw new Error('No primitive ' + message);
    },

    // Branding
    'brand/of:is-same-brand?:': function(a, b) {
      if (a == null || b == null)  return false;
      else                         return a[Brand]
                                       && b[Brand]
                                       && a[Brand] === b[Brand];
    },

    'brand/new:': function(description) {
      return { toString: function(){ return description }};
    },

    'brand/of:': function(object) {
      return object[Brand];
    },

    'brand/attach:to:': function(brand, object) {
      object[Brand] = brand;
    },

    // Special VM operations
    'failed?:': function(a) {
      return a == null;
    },

    'make-object:inheriting:': function(object, proto) {
      return $makeObject(object, proto);
    },

    'apply-trait-globally:': function(trait) {
      $methods.merge(trait);
    },

    'define-global:as:': function(name, value) {
      var record = Object.create(null);
      record[name] = value;
      $methods.merge($extendObject(Siren, record));
    },

    'global-methods': function() {
      return $methods;
    },

    // Native objects
    'native-string': function() {
      return String.prototype;
    },

    'native-float': function() {
      return Number.prototype;
    },

    'native-integer': function() {
      return BigNum.prototype;
    },

    'native-array': function() {
      return Array.prototype;
    },

    'native-object': function() {
      return Object.prototype;
    },

    'native-function': function() {
      return Function.prototype;
    },

    'native-global': function() {
      return globalObject;
    },

    // Special forms
    'if:then:else:': function(a, b, c) {
      return a? b : c;
    },

    'while:do:': function(a, b) {
      while(a()) b();
    },

    'forever:': function(a) {
      while(true) a();
    },

    'for:while:step:do:': function(a, b, c, d) {
      for(a(); b(); c()) d();
    },

    'try:recover:': function(f, recover) {
      try {
        return f();
      } catch(e) {
        return recover(e);
      }
    },

    // JS operations
    'js/to-string:': function(a) {
      return String(a);
    },

    'js/value:instance-of?:': function(a, b) {
      return a instanceof b;
    },

    'js/from:in:invoke:with:': function(object, context, selector, args) {
      return object[selector].apply(context, args);
    },

    'js/from:invoke:': function(object, selector) {
      return object[selector]();
    },

    'js/from:invoke:arg1:': function(object, selector, a) {
      return object[selector](a);
    },

    'js/from:invoke:arg1:arg2:': function(object, selector, a, b) {
      return object[selector](a, b);
    },

    'js/from:invoke:arg1:arg2:arg3:': function(object, selector, a, b, c) {
      return object[selector](a, b, c);
    },

    'js/call:': function(fn) {
      return fn();
    },

    'js/call:arg1:': function(fn, a) {
      return fn(a);
    },

    'js/call:arg1:arg2:': function(fn, a, b) {
      return fn(a, b);
    },

    'js/call:arg1:arg2:arg3:': function(fn, a, b, c) {
      return fn(a, b, c);
    },

    'js/call:with:': function(fn, args) {
      return fn.apply(null, args);
    },

    'js/new:': function(Ctor) {
      return new Ctor;
    },

    'js/new:with:': function(Ctor, args) {
      var instance = Object.create(Ctor.prototype);
      var result = Ctor.apply(instance, args);
      return Object(result) === result? result : instance;
    },

    'js/object:has:': function(object, key) {
      return key in object;
    },

    'js/object:at:': function(object, key) {
      return object[key];
    },

    'js/object:at:put:': function(object, key, value) {
      object[key] = value;
    },

    'js/object:delete-at:': function(object, key) {
      delete object[key];
    },

    'js/plus:and:': function(a, b) {
      return a + b;
    },

    'js/minus:and:': function(a, b) {
      return a - b;
    },

    'js/div:and:': function(a, b) {
      return a / b;
    },

    'js/mod:and:': function(a, b) {
      return a % b;
    },

    'js/bit-and:and:': function(a, b) {
      return a & b;
    },

    'js/bit-or:and:': function(a, b) {
      return a | b;
    },

    'js/bit-xor:and:': function(a, b) {
      return a ^ b;
    },

    'js/bit-shr:and:': function(a, b) {
      return a >> b;
    },

    'js/bit-shl:and:': function(a, b) {
      return a << b;
    },

    'js/bit-ushr:and:': function(a, b) {
      return a >>> b;
    },

    'js/and:and:': function(a, b) {
      return a && b;
    },

    'js/or:and:': function(a, b) {
      return a || b;
    },

    'js/not:': function(a) {
      return !a;
    },

    'js/abstract-equal:and:': function(a, b) {
      return a == b;
    },

    'js/strict-equal:and:': function(a, b) {
      return a === b;
    },

    'js/abstract-not-equal:and:': function(a, b) {
      return a != b;
    },

    'js/strict-not-equal:and:': function(a, b) {
      return a !== b;
    },

    'js/greater-than:and:': function(a, b) {
      return a > b;
    },

    'js/less-than:and:': function(a, b) {
      return a < b;
    },

    'js/greater-or-equal-to:and:': function(a, b) {
      return a >= b;
    },

    'js/less-or-equal-to:and:': function(a, b) {
      return a <= b;
    },

    // Method Boxes
    'method/list:for:': function(box, object) {
      return box.list(object);
    },

    'method/lookup:in:for:': function(name, box, object) {
      return box.lookup(object, name);
    },

    // Objects
    'object:has?:': function(object, name) {
      return name in Object(object);
    },

    'object:at:': function(object, name) {
      assert_string(name); assert_exists(object, name);
      return object[name];
    },

    'object:at-key:': function(object, name) {
      assert_exists(object, name);
      return object[name];
    },

    'object:at:put:': function(object, name, value) {
      assert_string(name);
      object[name] = value;
    },

    'object:remove-at:': function(object, key) {
      assert_string(key);
      delete object[key];
    },

    'object/keys:': function(object) {
      return Object.keys(object);
    },

    'object:equals?:': function(a, b) {
      return a === b;
    },

    'object:not-equals?:': function(a, b) {
      return a !== b;
    },

    'object/new': function() {
      return Object.create(null);
    },

    // Booleans
    'true': function() {
      return true;
    },

    'false': function() {
      return false;
    },

    // Numbers
    'float/max-value': function() {
      return Number.MAX_VALUE;
    },

    'float/min-value': function() {
      return Number.MIN_VALUE;
    },

    'float/nan': function() {
      return NaN;
    },

    'float/-infinity': function() {
      return Number.NEGATIVE_INFINITY;
    },

    'float/+infinity': function() {
      return Number.POSITIVE_INFINITY;
    },

    'float/nan?:': function(a) {
      assert_number(a);
      return isNaN(a);
    },

    'float/finite?:': function(a) {
      assert_number(a);
      return isFinite(a);
    },

    'float/as-exponential:': function(a) {
      assert_number(a);
      return a.toExponential();
    },

    'float:as-fixed:': function(a, b) {
      assert_number(a);
      return a.toFixed(b);
    },

    'float/as-locale-string:': function(a) {
      assert_number(a);
      return a.toLocaleString();
    },

    'float/as-string:': function(a) {
      assert_number(a);
      return a.toString();
    },

    'float:plus:': function(a, b) {
      assert_number(a); assert_number(b);
      return a + b;
    },

    'float:minus:': function(a, b) {
      assert_number(a); assert_number(b);
      return a - b;
    },

    'float:times:': function(a, b) {
      assert_number(a); assert_number(b);
      return a * b;
    },

    'float:div:': function(a, b) {
      assert_number(a); assert_number(b);
      return a / b;
    },

    'float:modulus:': function(a, b) {
      assert_number(a); assert_number(b);
      return a % b;
    },

    'float:equals?:': function(a, b) {
      if (isNumber(a) && isNumber(b)) {
        return a.valueOf() === b.valueOf();
      } else {
        return false;
      }
    },

    'float:not-equals?:': function(a, b) {
      assert_number(a); assert_number(b);
      return a.valueOf() !== b.valueOf();
    },

    'float:greater?:': function(a, b) {
      assert_number(a); assert_number(b);
      return a > b;
    },

    'float:greater-or-equal?:': function(a, b) {
      assert_number(a); assert_number(b);
      return a >= b;
    },

    'float:less-than?:': function(a, b) {
      assert_number(a); assert_number(b);
      return a < b;
    },

    'float:less-than-or-equal?:': function(a, b) {
      assert_number(a); assert_number(b);
      return a <= b;
    },

    'float:bit-shift-right:': function(a, b) {
      assert_number(a); assert_number(b);
      return a >> b;
    },

    'float:bit-shift-left:': function(a, b) {
      assert_number(a); assert_number(b);
      return a << b;
    },

    'float:unsigned-bit-shift-right:': function(a, b) {
      assert_number(a); assert_number(b);
      return a >>> b;
    },

    'float:bit-or:': function(a, b) {
      assert_number(a); assert_number(b);
      return a | b;
    },

    'float:bit-and:': function(a, b) {
      assert_number(a); assert_number(b);
      return a & b;
    },

    'float:bit-xor:': function(a, b) {
      assert_number(a); assert_number(b);
      return a ^ b;
    },

    'float/absolute:': function(a) {
      assert_number(a);
      return Math.abs(a);
    },

    'float/arccosine:': function(a) {
      assert_number(a);
      return Math.acos(a);
    },

    'float/arcsine:': function(a) {
      assert_number(a);
      return Math.asin(a);
    },

    'float/arctangent:': function(a) {
      assert_number(a);
      return Math.atan(a);
    },

    'float:arctangent:': function(a, b) {
      assert_number(a); assert_number(b);
      return Math.atan2(a, b);
    },

    'float/cosine:': function(a) {
      assert_number(a);
      return Math.cos(a);
    },

    'float/exp:': function(a) {
      assert_number(a);
      return Math.exp(a);
    },

    'float/log:': function(a) {
      assert_number(a);
      return Math.log(a);
    },

    'float:power:': function(a, b) {
      assert_number(a); assert_number(b);
      return Math.pow(a, b);
    },

    'float/sine:': function(a) {
      assert_number(a);
      return Math.sin(a);
    },

    'float/square-root:': function(a) {
      assert_number(a);
      return Math.sqrt(a);
    },

    'float/tangent:': function(a) {
      assert_number(a);
      return Math.tan(a);
    },

    'float/ceil:': function(a) {
      assert_number(a);
      return Math.ceil(a);
    },

    'float/floor:': function(a) {
      assert_number(a);
      return Math.floor(a);
    },

    'float/round:': function(a) {
      assert_number(a);
      return Math.round(a);
    },

    // Big Ints
    'int/to-string:': function(a) {
      assert_bigint(a);
      return a.toString();
    },

    'int/to-number:': function(a) {
      assert_bigint(a);
      return a.toNumber();
    },

    'int/plus:and:': function(a, b) {
      assert_bigint(b);
      return a.add(b);
    },

    'int/sub:and:': function(a, b) {
      assert_bigint(b);
      return a.sub(b);
    },

    'int/mul:and:': function(a, b) {
      assert_bigint(b);
      return a.mul(b);
    },

    'int/div:and:': function(a, b) {
      assert_bigint(b);
      return a.div(b);
    },

    'int/abs:': function(a) {
      return a.abs();
    },

    'int/neg:': function(a) {
      return a.neg();
    },

    'int/cmp:and:': function(a, b) {
      assert_bigint(b);
      return a.cmp(b);
    },

    'int/gt:and:': function(a, b) {
      assert_bigint(b);
      return a.gt(b);
    },

    'int/ge:and:': function(a, b) {
      assert_bigint(b);
      return a.ge(b);
    },

    'int/eq:and:': function(a, b) {
      assert_bigint(b);
      return a.eq(b);
    },

    'int/lt:and:': function(a, b) {
      assert_bigint(b);
      return a.lt(b);
    },

    'int/le:and:': function(a, b) {
      assert_bigint(b);
      return a.le(b);
    },

    'int/band:and:': function(a, b) {
      assert_bigint(b);
      return a.and(b);
    },

    'int/bor:and:': function(a, b) {
      assert_bigint(b);
      return a.or(b);
    },

    'int/bxor:and:': function(a, b) {
      assert_bigint(b);
      return a.xor(b);
    },

    'int/mod:and:': function(a, b) {
      assert_bigint(b);
      return a.mod(b);
    },

    'int/pow:by:': function(a, b) {
      return a.pow(b);
    },

    'int/sqrt:': function(a) {
      return a.sqrt();
    },

    'int/shift-left:by:': function(a, b) {
      return a.shiftLeft(b);
    },

    'int/shift-right:by:': function(a, b) {
      return a.shiftRight(b);
    },

    'int/bit-length:': function(a) {
      return a.bitLength();
    },

    // Strings
    'string:repeat:': function(a, b) {
      assert_string(a);
      assert_number(b);
      return Array(b + 1).join(a);
    },

    'string/length:': function(a) {
      assert_string(a);
      return a.length;
    },

    'string/from-char-code:': function(a) {
      assert_string(a);
      return String.fromCharCode(a);
    },

    'string:at:': function(a, b) {
      assert_string(a); assert_number(b); assert_bounds(b, 1, a.length);
      return a.charAt(b - 1);
    },

    'string:code-at:': function(a, b) {
      assert_string(a); assert_number(b); assert_bounds(b, 1, a.length);
      return a.charCodeAt(b - 1);
    },

    'string:concat:': function(a, b) {
      return a + b;
    },

    'string:index-of:': function(a, b) {
      assert_string(a); assert_string(b);
      return a.indexOf(b) + 1;
    },

    'string:last-index-of:': function(a, b) {
      assert_string(a); assert_string(b);
      return a.lastIndexOf(b) + 1;
    },

    'string:slice-from:': function(a, b) {
      assert_string(a); assert_number(b); assert_bounds(b, 1, a.length);
      return a.slice(b + 1);
    },

    'string:slice-from:to:': function(a, b, c) {
      assert_string(a); assert_number(b); assert_number(c);
      assert_bounds(b, 1, a.length); assert_bounds(c, b, a.length);
      return a.slice(a, b, c);
    },

    'string/lower-case:': function(a) {
      assert_string(a);
      return a.toLowerCase();
    },

    'string/upper-case:': function(a) {
      assert_string(a);
      return a.toUpperCase();
    },

    'string/trim:': function(a) {
      assert_string(a);
      return a.trim();
    },

    'string:each:': function(a, f) {
      assert_string(a);
      for (var i = 0; i < a.length; ++i)
        f(a.charAt(i));
    },

    'string:equals?:': function(a, b) {
      if (!isString(a) || !isString(b)) {
        return false;
      } else {
        return a.valueOf() === b.valueOf();
      }
    },

    'string:split:': function(a, b) {
      assert_string(a); assert_string(b);
      return a.split(b);
    },

    // Arrays
    'array/new': function() {
      return [];
    },

    'array/new:with:': function(a, b) {
      assert_number(a);
      var xs = [];
      for (var i = 0; i < a; ++i) xs[i] = b;
      return xs;
    },

    'array/length:': function(a) {
      assert_array(a);
      return a.length;
    },

    'array:concat:': function(a, b) {
      assert_array(a); assert_array(b);
      return a.concat(b);
    },

    'array:at:': function(a, b) {
      assert_array(a); assert_number(b); assert_bounds(b, 1, a.length);
      return a[b - 1];
    },

    'array:at:put:': function(a, b, c) {
      assert_array(a); assert_number(b); assert_bounds(b, 1, a.length);
      a[b - 1] = c;
    },

    'array:reduce:from:': function(a, f, i) {
      assert_array(a);
      var r = i;
      for (var j = 0; j < a.length; ++j) r = f(r, a[j]);
      return r;
    },

    'array:reduce-right:from:': function(a, f, i) {
      assert_array(a);
      var r = i;
      for (var j = a.length; --j;) r = f(r, a[j]);
      return r;
    },

    'array:each:': function(a, f) {
      assert_array(a);
      for (var i = 0; i < a.length; ++i)
        f(a[i]);
    },

    'array:map:': function(a, f) {
      assert_array(a);
      var result = [];
      for (var i = 0; i < a.length; ++i)
        result[i] = f(a[i]);
      return result;
    },

    'array:filter:': function(a, f) {
      assert_array(a);
      var result = [];
      for (var i = 0; i < a.length; ++i)
        if (f(a[i]))  result.push(a[i]);
      return result;
    },

    'array:index-of:': function(a, b) {
      assert_array(a);
      return a.indexOf(b) + 1;
    },

    'array:last-index-of:': function(a, b) {
      assert_array(a);
      return a.lastIndexOf(b) + 1;
    },

    'array:join:': function(a, b) {
      assert_array(a); assert_string(b);
      return a.join(b);
    },

    'array:push:': function(a, b) {
      assert_array(a);
      a.push(b);
    },

    'array/shallow-copy:': function(a) {
      assert_array(a);
      return a.slice();
    },

    'array/pop:': function(a) {
      assert_array(a);
      return a.pop();
    },

    'array/shift:': function(a) {
      assert_array(a);
      return a.shift();
    },

    'array:unshift:': function(a, b) {
      assert_array(a);
      return a.unshift(b);
    },

    'array/reverse:': function(a) {
      assert_array(a);
      return a.reverse();
    },

    'array:sort:': function(a, f) {
      assert_array(a);
      return a.sort(f);
    },

    'array:remove-at:': function(a, b) {
      assert_array(a); assert_number(b); assert_bounds(b, 1, a.length);
      a.splice(b, 1);
    },

    // Errors
    'throw:': function(e) {
      throw e;
    },

    'error:reason:': function(name, reason) {
      var e = new Error(reason);
      e.name = name;
      return e;
    },

    // Parsing
    'parse/float:': function(a) {
      assert_string(a);
      return parseFloat(a);
    },

    'parse/int:radix:': function(a, b) {
      assert_string(a); assert_number(b);
      return parseInt(a, b);
    },

    // JSON
    'json/parse:': function(a) { // TODO: handle errors
      assert_string(a);
      return JSON.parse(a);
    },

    'json/stringify:': function(a) {
      return JSON.stringify(a);
    },

    // Functions
    'function:in-context:call-with-argument:': function(a, b, c) {
      assert_function(a);
      return a.call(b, c);
    },

    'function:in-context:apply-arguments:': function(a, b, c) {
      assert_function(a); assert_array(c);
      return a.apply(b, c);
    },

    'function/invoke0:': function(f) {
      assert_arity(f, 0);
      return f();
    },

    'function/invoke1:a:': function(f, a) {
      assert_arity(f, 1);
      return f(a);
    },

    'function/invoke2:a:b:': function(f, a, b) {
      assert_arity(f, 2);
      return f(a, b);
    },

    'function/invoke3:a:b:c:': function(f, a, b, c) {
      assert_arity(f, 3);
      return f(a, b, c);
    },

    'function/invoke4:a:b:c:d:': function(f, a, b, c, d) {
      assert_arity(f, 4);
      return f(a, b, c, d);
    },

    'function/invoke5:a:b:c:d:e:': function(f, a, b, c, d, e) {
      assert_arity(f, 5);
      return f(a, b, c, d, e);
    },

    'function/invoke*:with:': function(f, xs) {
      assert_arity(f, xs.length);
      return f.apply(null, xs);
    },

    'function/arity:': function(a) {
      assert_function(a);
      return a.length;
    },

    'function/name:': function(a) {
      return '<function ' + nameOf(this).slice(1, -1) + '>';
    },

    // foreign
    'symbol:': function(name) {
      return Symbol(name);
    },

    'foreign/invoke*:in:with:': function(f, c, xs) {
      return f.apply(c, xs);
    },

    'foreign/convert:as:': function(f, c) {
      f[$export] = c;
    },

    'foreign/export:': function(o) {
      if (o[$export]) {
        return o[$export](o);
      } else {
        return wrap(o, $methods);
      }
    },

    'foreign/match:with:': function(o, p) {
      if (o[$import]) {
        return o[$import]();
      } else {
        var type = o == null?         'unit'
                 : isBooleanP(o)?     'boolean'
                 : isPrimitiveP(o)?   'primitive'
                 : Array.isArray(o)?  'array'
                 : /* otherwise */    'object';
        return $send(p, type, $methods, []);
      }
    },

    // Assertions
    'assert/function:has-arity:': assert_arity,
    'assert/number?:': assert_number,
    'assert/function?:': assert_function,
    'assert/string?:': assert_string,
    'assert/array?:': assert_array,
    'assert/object:has-key:': assert_exists,
    'assert/number:is-at-least:and-at-most:': assert_bounds,

    // Global prototypes / Utilities
    'native-console': function() {
      return console;
    },




    'meta/for:at:': function(object, name) {
      assert_string(name);
      return $meta.get(object, name);
    },

    'meta/for:at:put:': function(object, name, value) {
      assert_string(name);
      $meta.set(object, name, value);
    },

    'defer:': function(f) {
      process.nextTick(f);
    },

    'timer/delay:by:': function(f, s) {
      return setTimeout(f, s);
    },

    'timer/cancel:': function(x) {
      clearTimeout(x);
    },

    'debugger': function(){
      debugger;
    },

    'require:': function(path) {
      return require(path);
    },

    // File System
    'path/join:to:': function(a, b) {
      return path.join(a, b);
    },
    'path/extension:': function(a) {
      return path.extname(a);
    },
    'path/normalise:': function(a) {
      assert_string(a);
      return path.normalize(a);
    },
    'path/absolute?:': function(a) {
      assert_string(a);
      return path.isAbsolute(a);
    },
    'fs/exists?:notify:': function(p, c) {
      fs.exists(p, c);
    },
    'fs/rename:to:on-success:on-failure:': function(a, b, f, g) {
      fs.rename(a, b, function(err, res) {
        if (err) g(err); else f(res);
      });
    },
    'fs/change:owner:group:on-success:on-failure:': function(a, b, c, f, g) {
      assert_number(b); assert_number(c);
      fs.chown(a, b, c, function(err, res) {
        if (err) g(err); else f(res);
      });
    },
    'fs/change:mode:on-success:on-failure:': function(a, b, f, g) {
      assert_number(b);
      fs.chmod(a, b, function(err, res) {
        if (err) g(err); else f(res);
      });
    }
  }, null);

  // -- Module loading -------------------------------------------------
  function loadModule(name) {
    if (moduleCache[name]) {
      moduleCache[name] = require(name)(Siren, Primitives);
    }
    return moduleCache[name];
  }

  // -- Global configuration -------------------------------------------
  // Special internal functions available to all modules
  var Siren = Object.create(Base);
  extend(Siren, {
    '$methods'      : $methods,
    '$send'         : $send,
    '$extend'       : $extendObject,
    '$make'         : $makeObject,
    '$fn'           : $makeFunction,
    '$int'          : BigNum,
    '$negint'       : function(a){ return BigNum(a).neg() },
    '$return'       : $return,
    '$handleReturn' : $handleReturn
  });

  $methods.merge($extendObject(Siren, {
    'Root': function(){ return Base }
  }));

  // Define global objects that are reachable in the prelude
  // Modules are expected to update the globals as necessary
  require('./00-Core')(Siren, Primitives);
  require('./01-Meta')(Siren, Primitives);
  require('./02-JS-Alien')(Siren, Primitives);
  require('./03-Reflection')(Siren, Primitives);
  require('./04-Result')(Siren, Primitives);
  require('./05-Block')(Siren, Primitives);
  require('./06-Boolean')(Siren, Primitives);
  require('./07-Text')(Siren, Primitives);
  require('./08-Tuple')(Siren, Primitives);
  require('./09-Numeric')(Siren, Primitives);
  require('./10-Range')(Siren, Primitives);
  require('./11-Reference')(Siren, Primitives);

  return Siren;
}();
