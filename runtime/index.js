//----------------------------------------------------------------------
//
// This source file is part of the Siren project.
//
// Copyright (C) 2013-2015 Quildreen Motta.
// Licensed under the MIT licence.
//
// See LICENCE for licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

// # module: siren/runtime
'use strict';

// -- Dependencies -----------------------------------------------------
var BigNum    = require('bignum');
var isNumber  = require('is-number-object');
var isString  = require('is-string');
var isBoolean = require('is-boolean-object');
var showJs    = require('core.inspect');


// -- Aliases ----------------------------------------------------------
var prototypeOf   = Object.getPrototypeOf;
var isPrototypeOf = Object.prototype.isPrototypeOf;
var keys          = Object.keys;
var globalObject  = typeof window !== 'undefined'?  window
                  : typeof global !== 'undefined'?  global
                  : /* otherwise */                 raise(new Error('This platform is not supported.'));


// -- Helpers ----------------------------------------------------------

// ### function: raise(error)
//
// `throw` as an expression.
function raise(error) {
  throw error;
}

// ### function: extend(a, b)
//
// Copies all own enumerable properties of `b` to `a`
//
// @type: (Object, Object) -> Object
function extend(a, b) {
  var ks = keys(b);
  for (var i = 0; i < ks.length; ++i) {
    var key = ks[i];
    a[key] = b[key];
  }
  return a;
}

function parseArgs(fn) {
  return (fn.toString().match(/function\s*[^\(]*\(([^\)]*)\)/) || [null, ''])[1]
           .split(',')
           .map(function(a){ return a.trim(); })
           .filter(Boolean);
}

function safeDescribe(o) {
  try {
    var s = o.send0($context, 'describe');
    assert_textual(s);
    return s.string;
  } catch (e) {
    return '<unrepresentable object>';
  }
}

function separateThousands(n, separator) {
  return String(n).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + separator);
}

// -- Assertions -------------------------------------------------------
function assert_arity(f, n) {
  if (f.length !== n) {
    throw new RangeError('Wrong number of arguments: ' + f.length + ' of ' + n);
  }
}

function assert_string(s) {
  if (typeof s !== 'string')
    throw new TypeError('Expected Text.');
}

function assert_tuple(a) {
  if (!(a instanceof _Tuple))
    throw new TypeError('Expected Tuple.');
}

function assert_text(a) {
  if (!(a instanceof _Text))
    throw new TypeError('Expected Text.');
}

function assert_textual(a) {
  if (typeof a.string !== "string")
    throw new TypeError('Expected a textual value.');
}

function assert_message(m) {
  if (!(m instanceof _Message))
    throw new TypeError('Expected Message.');
}

function assert_context(a) {
  if (!(a instanceof Context))
    throw new TypeError('Expected Context.');
}

function assert_selector(a) {
  if (!(a instanceof _Selector))
    throw new TypeError('Expected Selector.');
}

function assert_perspective(a) {
  if (!(a instanceof _Perspective))
    throw new TypeError('Expected Perspective.');
}


// -- Internal object hierarchy ----------------------------------------

var Siren_Object = Object.create(null);

var Siren_Root = Object.create(Siren_Object);
var Siren_Module = Object.create(Siren_Object);
var Siren_Importer = Object.create(Siren_Object);
var Siren_Context = Object.create(Siren_Object);
var Siren_Perspective = Object.create(Siren_Object);
var Siren_Selector = Object.create(Siren_Object);
var Siren_Message = Object.create(Siren_Object);

var Siren_Brand = Object.create(Siren_Object);
var Siren_ObjectBranding = Object.create(Siren_Object);

var Siren_Block = Object.create(Siren_Object);
var Siren_Block0 = Object.create(Siren_Block);
var Siren_Block1 = Object.create(Siren_Block);
var Siren_Block2 = Object.create(Siren_Block);
var Siren_Block3 = Object.create(Siren_Block);
var Siren_BlockN = Object.create(Siren_Block);

var Siren_Method = Object.create(Siren_Object);
var Siren_Method0 = Object.create(Siren_Method);
var Siren_Method1 = Object.create(Siren_Method);
var Siren_Method2 = Object.create(Siren_Method);
var Siren_Method3 = Object.create(Siren_Method);
var Siren_MethodN = Object.create(Siren_Method);


var Siren_Text = Object.create(Siren_Object);
var Siren_DebugText = Object.create(Siren_Object);
var Siren_Numeric = Object.create(Siren_Object);
var Siren_Integer = Object.create(Siren_Numeric);
var Siren_Float = Object.create(Siren_Numeric);
var Siren_Tuple = Object.create(Siren_Object);


// -- Internal names ---------------------------------------------------

// Points to the default perspective.
var defaultPerspective = Symbol('default-perspective');

// Points to the list of brands attached to the object.
var brands = Symbol('brands');


// -- Handling meta-data -----------------------------------------------

// ### class: Meta()
//
// Every object in Siren may contain meta-data about itself. This
// meta-data lives in a separate object. The `Meta` object holds
// mappings of Siren objects to a dictionary of meta-data.
function Meta() {
  this.data = new WeakMap();
}

// #### method: get(object, name)
//
// Retrieves a particular piece of data about an object.
//
// @type: (Siren.Object, String) -> Siren.Object | null
Meta.prototype.get = function(object, name) {
  if (name == null) {
    return null;
  } else {
    return (this.data.get(object) || {})[name];
  }
};

// #### method: set(object, name, value)
//
// Attaches a piece of meta-data to an object.
//
// @type: (Siren.Object, String, Siren.Object) -> null
Meta.prototype.set = function(object, name, value) {
  if (name != null) {
    var metas = this.data.get(object) || {};
    metas[name] = value;
    this.data.set(object, metas);
  }
};

Meta.prototype.update = function(object, meta) {
  var oldMeta = this.data.get(object) || {};
  this.data.set(object, extend(oldMeta, meta));
};

Meta.prototype.updateIfNotExists = function(object, meta) {
  var oldMeta = this.data.get(object) || {};
  this.data.set(object, extend(meta, oldMeta));
};


// -- Context for perspectives -----------------------------------------

// ### class: Context()
//
// Provides scoped resolution of message names to message selectors.
//
// Messages in Siren are stored in each object as unique selector
// values. To translate a name such as `+` or `add:to:` it uses a
// `MethodBox` object available in that scope, which provides the
// mapping of names to selector values.
//
// @type: new(Context | null)
function Context(parent) {
  this.parent   = parent;
  this.mappings = new WeakMap();
}

Context.prototype = Siren_Context;

// #### method: set(object, value)
//
// Adds a new mapping to the given object.
//
// @type: (Siren.Object, { String -> Symbol }) -> null
Context.prototype.set = function(object, value) {
  this.mappings.set(object, value);
};

// #### method: get(object)
//
// Returns the mapping for the given object.
//
// @type: Siren.Object -> { String -> Symbol }
Context.prototype.get = function(object) {
  return this.mappings.get(object);
};

// #### method: lookup(object, name)
//
// Retrieves the selector value for the object / name pair provided.
// Looks up in the whole prototype chain of the object before falling
// back to the parent (Context) scope.
//
// @type: (Siren.Object, String) -> Symbol | null
Context.prototype.lookup = function(object, name) {
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

// #### method: merge(...traits)
//
// Adds a series of traits to the mappings in this method box.
//
// @type: (...(Object, { String -> Symbol })) -> null
Context.prototype.merge = function(pairs) {
  for (var i = 0; i < pairs.length; ++i) {
    var pair = pairs[i];
    var object = pair[0];
    var mappings = pair[1];
    var box = this.get(object) || {};
    extend(box, mappings);
    this.set(object, box);
  }
  return this;
};

// #### method: clone()
//
// Returns a new Context that inherits the mappings of this one.
//
// @type: () -> Context
Context.prototype.clone = function() {
  return new Context(this);
};

// -- Non-local returns ------------------------------------------------
// #### class: Return()
//
// Represents non-local returns.
//
// @type: new (Siren.Object)
function Return(value) {
  this.value = value;
}

// #### function: $return(value)
//
// Does a non-local return (can only be used inside blocks).
//
// @type: (Siren.Object) -> null :: throws Siren.Object
function $return(value) {
  throw new Return(value);
}

// #### function: $handleReturn(value)
//
// Handles non-local returns after the stack has been unwinded.
// This accounts for the possibility of non-Return objects being
// thrown by Siren code.
//
// @type: (Any) -> Siren.Object | null :: throws Object
function $handleReturn(value) {
  if (value instanceof Return)
    return value.value;
  else
    throw value;
}


// -- Support for constructing instances of internal objects -----------

function _Block0(fn) {
  assert_arity(fn, 0);
  this.call = fn;
}
_Block0.prototype = Siren_Block0;

function _Block1(fn) {
  assert_arity(fn, 1);
  this.call = fn;
}
_Block1.prototype = Siren_Block1;

function _Block2(fn) {
  assert_arity(fn, 2);
  this.call = fn;
}
_Block2.prototype = Siren_Block2;

function _Block3(fn) {
  assert_arity(fn, 3);
  this.call = fn;
}
_Block3.prototype = Siren_Block3;

function _BlockN(fn) {
  this.call = fn;
}
_BlockN.prototype = Siren_BlockN;


function _Method0(fn) {
  assert_arity(fn, 0);
  this.call = fn;
}
_Method0.prototype = Siren_Method0;

function _Method1(fn) {
  assert_arity(fn, 1);
  this.call = fn;
}
_Method1.prototype = Siren_Method1;

function _Method2(fn) {
  assert_arity(fn, 2);
  this.call = fn;
}
_Method2.prototype = Siren_Method2;

function _Method3(fn) {
  assert_arity(fn, 3);
  this.call = fn;
}
_Method3.prototype = Siren_Method3;

function _MethodN(fn) {
  this.call = fn;
}
_MethodN.prototype = Siren_MethodN;


function _Text(s) {
  this.string = s;
}
_Text.prototype = Siren_Text;
_Text.prototype.toString = function(){ return this.string; };


function _Integer(n) {
  this.number = n;
}
_Integer.prototype = Siren_Integer;


function _Float(n) {
  this.number = n;
}
_Float.prototype = Siren_Float;


function _Tuple(v) {
  this.array = v;
}
_Tuple.prototype = Siren_Tuple;


function _Perspective(object, mappings) {
  this.object = object;
  this.mappings = mappings;
}
_Perspective.prototype = Siren_Perspective;


function _Selector(symbol) {
  this.symbol = symbol;
}
_Selector.prototype = Siren_Selector;


function _Message(name, args) {
  this.name = name;
  this.args = args;
}
_Message.prototype = Siren_Message;


function _Importer(mod) {
  this.module = mod;
  this.require = mod.require;
}
_Importer.prototype = Siren_Importer;


function _DebugText(text) {
  this.string = text;
}
_DebugText.prototype = Siren_DebugText;
_DebugText.prototype.string = "";
_DebugText.prototype.toString = function(){ return this.string; };

// -- Internal methods -------------------------------------------------

// Recovering messages
function recover(object, context, originalMessage, args) {
  var selector = context.lookup(object, 'does-not-understand:');
  if (selector && object[selector]) {
    var message = new _Message(originalMessage, args);
    return object[selector].call(object, message);
  } else {
    throw new Error('Failed to send ' + message);
  }
}

// Sending messages
Siren_Object.send0 = function(context, message) {
  var selector = context.lookup(this, message);
  if (selector)
    return this[selector].call(this);
  else
    return recover(this, context, message, []);
};

Siren_Object.send1 = function(context, message, a) {
  var selector = context.lookup(this, message);
  if (selector)
    return this[selector].call(this, a);
  else
    return recover(this, context, message, [a]);
};

Siren_Object.send2 = function(context, message, a, b) {
  var selector = context.lookup(this, message);
  if (selector)
    return this[selector].call(this, a, b);
  else
    return recover(this, context, message, [a, b]);
};

Siren_Object.send3 = function(context, message, a, b, c) {
  var selector = context.lookup(this, message);
  if (selector)
    return this[selector].call(this, a, b, c);
  else
    return recover(this, context, message, [a, b, c]);
};

Siren_Object.sendN = function(context, message, args) {
  var selector = context.lookup(this, message);
  if (selector)
    return this[selector].call.apply(this[selector], [this].concat(args));
  else
    return recover(this, context, message, args);
};


// -- Global instances -------------------------------------------------

// The global context for perspectives
var $context = new Context(null);

// The global meta-data mapping
var $meta = new Meta();


// -- Constructing internal instances ----------------------------------

function objectToRecord(object, context) {
  var box = context.get(object) || {};
  var r = {};
  keys(box).forEach(function(key) {
    r[key] = object[box[key]];
  });
  return r;
}

function $extendObject(object, record) {
  var mapping = {};
  var ks = keys(record);
  for (var i = 0; i < ks.length; ++i) {
    var key = ks[i];
    var selector = Symbol(key);
    object[selector] = record[key];
    mapping[key] = selector;
  }

  return [object, mapping];
}

function $makeObject(record, prototype) {
  var result = Object.create(prototype);
  result[defaultPerspective] = $extendObject(result, record);
  $context.merge([result[defaultPerspective]]);
  return result;
}

function $makeInternalObject(record) {
  keys(record).forEach(function(k) {
    record[k] = $makeFunction(record[k]);
  });

  return $makeObject(record, Siren_Object);
}

function $_extend(object, record) {
  keys(record).forEach(function(k) {
    var o = {};
    o[k] = $makeFunction(record[k], {
      name: new _Text(k),
      arguments: new _Tuple(parseArgs(record[k]).slice(1).map($text)),
      documentation: new _Text(''),
      source: '<native>',
      filename: '<native>'
    });
    $context.merge([$extendObject(object, o)]);
  });
  return object;
}

function $makeFunction(fn, meta) {
  meta = meta || {};
  if (meta.name)  fn.displayName = meta.name.string;
  var result;
  switch (fn.length) {
    case 0:
    result = new _Method0(fn);
    break;

    case 1:
    result = new _Method1(fn);
    break;

    case 2:
    result = new _Method2(fn);
    break;

    case 3:
    result = new _Method3(fn);
    break;

    default:
    result = new _MethodN(fn);
  }
  $meta.update(result, meta);
  return result;
}

function $makeBlock(fn, meta) {
  meta = meta || {};
  if (meta.name)  fn.displayName = meta.name.string;
  var result;
  switch (fn.length) {
    case 0:
    result = new _Block0(fn);
    break;

    case 1:
    result = new _Block1(fn);
    break;

    case 2:
    result = new _Block2(fn);
    break;

    case 3:
    result = new _Block3(fn);
    break;

    default:
    result = new _BlockN(fn);
  }
  $meta.update(result, meta);
  return result;
}

function $makeModule(jsModule, require, runtime) {
  var module = Object.create(Siren_Module);
  module.filename = jsModule.filename;
  module.require = require;
  module.runtime = runtime;
  module.context = runtime.$context.clone();
  return module;
}

function $withMeta(value, meta) {
  if (value != null && isPrototypeOf.call(Siren_Object, value)) {
    $meta.updateIfNotExists(value, meta || {});
    return value;
  }
}

function $int(n) {
  return new _Integer(BigNum(n));
}

function $negInt(n) {
  return new _Integer(BigNum(n).neg());
}

function $float(n) {
  return new _Float(n);
}

function $text(s) {
  return new _Text(s);
}

function $tuple(xs) {
  return new _Tuple(xs);
}

var Siren = {
  // Global stuff
  '$context': $context,
  '$global': Siren_Root,
  '$object': Siren_Object,

  // Internal functions
  '$negint': $negInt,
  '$int': $int,
  '$float': $float,
  '$text': $text,
  '$tuple': $tuple,
  '$makeModule': $makeModule,
  '$makeFunction': $makeFunction,
  '$makeBlock': $makeBlock,
  '$makeObject': $makeObject,
  '$withMeta': $withMeta
};


// -- Primitives for the runtime ---------------------------------------
$_extend(Siren_Root, {
  'describe': function() {
    return new _DebugText('<Root>');
  },
  'vm'             : function(){ return Primitives; },
  'Root'           : function(){ return Siren_Root; },
  'Module'         : function(){ return Siren_Module; },
  'Importer'       : function(){ return Siren_Importer; },
  'Context'        : function(){ return Siren_Context; },
  'Perspective'    : function(){ return Siren_Perspective; },
  'Selector'       : function(){ return Siren_Selector; },
  'Message'        : function(){ return Siren_Message; },

  'Brand'           : function(){ return Siren_Brand; },
  'Object-Branding' : function(){ return Siren_ObjectBranding; },

  'Block'          : function(){ return Siren_Block; },
  'Nullary-Block'  : function(){ return Siren_Block0; },
  'Unary-Block'    : function(){ return Siren_Block1; },
  'Binary-Block'   : function(){ return Siren_Block2; },
  'Ternary-Block'  : function(){ return Siren_Block3; },
  'N-Ary-Block'    : function(){ return Siren_BlockN; },

  'Method'         : function(){ return Siren_Method; },
  'Nullary-Method' : function(){ return Siren_Method0; },
  'Unary-Method'   : function(){ return Siren_Method1; },
  'Binary-Method'  : function(){ return Siren_Method2; },
  'Ternary-Method' : function(){ return Siren_Method3; },
  'N-Ary-Method'   : function(){ return Siren_MethodN; },

  'Object'         : function(){ return Siren_Object; },
  'Text'           : function(){ return Siren_Text; },
  'Numeric'        : function(){ return Siren_Numeric; },
  'Integer'        : function(){ return Siren_Integer; },
  'Float-64bits'   : function(){ return Siren_Float; },
  'Tuple'          : function(){ return Siren_Tuple; },
  'Debug-Text'     : function(){ return Siren_DebugText; }
});

$_extend(Siren_Object, {
  'does-not-understand:': function(self, message) {
    assert_message(message);
    var reason = safeDescribe(self) + " does not understand " +
          message.name + ".\n\n" +
          "It was given the arguments: [" +
          message.args.map(safeDescribe).join(',') +
          "], but is unable to perform any computation.\n\n" +
          "Possible causes for this are:\n\n" +
          " - Mistyping the message name;\n" +
          " - Sending the message to the wrong object;\n" +
          " - Not importing the correct traits in the current scope.";
    var e = new Error(reason);
    e.name = "<Message Send Failure>";
    throw e;
  },

  'perform:in:': function(self, message, context) {
    assert_message(message);
    assert_context(context);
    return self.sendN(context, message.name, message.args);
  },

  'refined-by:': function(self, object) {
    return $makeObject(objectToRecord(object, $context), self);
  },

  'refined-by:in:': function(self, object, context) {
    return $makeObject(objectToRecord(object, context), self);
  },

  'extended-by:in:': function(self, object, context) {
    var p = $extendObject(self, objectToRecord(object, context));
    return new _Perspective(p[0], p[1]);
  },

  'extended-by:': function(self, object) {
    return self.send2($context, 'extended-by:in:', object, $context);
  },

  'describe': function(self) {
    var name = $meta.get(self, 'name');
    return new _DebugText('<' + (name || 'Anonymous Object') + '>');
  }
});

$_extend(Siren_Selector, {
  'describe': function(self) {
    return new _DebugText('<Selector: ' + self.symbol.toString() + '>');
  },

  'with-description:': function(self, description) {
    assert_text(description);
    return new _Selector(description);
  },

  '===': function(self, that) {
    assert_selector(that);
    return self.symbol === that.symbol;
  },

  'description': function(self) {
    return new _Text(self.symbol.toString());
  }
});

$_extend(Siren_Message, {
  'describe': function(self) {
    return new _DebugText('<Message: ' + self.name + '>');
  },

  'name:arguments:': function(self, name, args) {
    assert_text(name);
    assert_tuple(args);
    return new _Message(name.string, args.array);
  },

  'send-to:in:': function(self, object, context) {
    return object.sendN(context, self.name, self.args);
  },

  'name': function(self) {
    return new _Text(self.name);
  },

  'arguments': function(self) {
    return new _Tuple(self.args);
  }
});

$_extend(Siren_Context, {
  'describe': function(self) {
    return new _DebugText('<Context>');
  },

  'empty': function(self) {
    return new Context(null);
  },

  'with:': function(self, perspective) {
    assert_perspective(perspective);
    return self.clone().merge([[perspective.object, perspective.mappings]]);
  }
});

$_extend(Siren_Perspective, {
  'describe': function(self) {
    return new _DebugText('<Perspective on: ' + safeDescribe(self.object) + '>');
  },

  'target': function(self) {
    return this.object;
  },

  ',': function(self, perspective) {
    assert_perspective(perspective);
    var result = Object.create(self);
    result.mappings = {};
    extend(result.mappings, self.mappings);
    extend(result.mappings, perspective.mappings);
  }
});

$_extend(Siren_Module, {
  'describe': function(self) {
    return new _DebugText('<Module at: ' + self.filename + '>');
  },
  'filename': function(self) {
    return new _Text(self.filename);
  },
  'context': function(self) {
    return self.context;
  },
  'import': function(self) {
    return new _Importer(self);
  }
});

$_extend(Siren_Importer, {
  'describe': function(self) {
    return new _DebugText('<Importer in ' + safeDescribe(self.module) + '>');
  },

  'siren:with-arguments:': function(self, module_id, _arguments) {
    assert_text(module_id);
    assert_tuple(_arguments);
    return self.require(module_id.string)
               .apply(null, [Siren].concat(_arguments.array));
  }
});

$_extend(Siren_Block, {
  'describe': function(self) {
    return new _DebugText('<Block arity: ' + self.call.length + '>');
  },

  'apply:': function(self, _arguments) {
    return self.call.apply(_arguments);
  }
});

$_extend(Siren_Block0, {
  'value': function(self) {
    return self.call();
  }
});

$_extend(Siren_Block1, {
  'call:': function(self, arg1) {
    return self.call(arg1);
  }
});

$_extend(Siren_Block2, {
  'call:with:': function(self, arg1, arg2) {
    return self.call(arg1, arg2);
  }
});

$_extend(Siren_Block3, {
  'call:with:with:': function(self, arg1, arg2, arg3) {
    return self.call(arg1, arg2, arg3);
  }
});

$_extend(Siren_Method, {
  'describe': function(self) {
    return new _DebugText('<Unbound-Method arity: ' + self.call.length + '>');
  },

  'in:apply:': function(self, target, _arguments) {
    return self.call.apply(target, [target].concat(_arguments));
  }
});

$_extend(Siren_Method0, {
  'in:': function(self, target) {
    return self.call.call(target, target);
  }
});

$_extend(Siren_Method1, {
  'in:call:': function(self, target, arg1) {
    return self.call.call(target, target, arg1);
  }
});

$_extend(Siren_Method2, {
  'in:call:with:': function(self, target, arg1, arg2) {
    return self.call.call(target, target, arg1, arg2);
  }
});

$_extend(Siren_Method3, {
  'in:call:with:with:': function(self, target, arg1, arg2, arg3) {
    return self.call.call(target, target, arg1, arg2, arg3);
  }
});

$_extend(Siren_Text, {
  'describe': function(self) {
    var text = self.string.replace(/(\\)/g, '\\$1')
                          .replace(/(")/g, '\\$1');
    return new _DebugText('"' + text + '"');
  }
});


var Primitives = $makeInternalObject({
  'describe': function() {
    return new _DebugText('<VM Primitives>');
  },

  // ---- Assertions
  'assert/text:': function(_, a) {
    assert_text(a);
  },

  'assert/selector:': function(_, a) {
    if (a.symbol == null)
      throw new TypeError("Expected a selector.");
  },

  'assert/number:between:and:': function(_, a, b, c) {
    if (a.number < b.number || a.number > c.number)
      throw new RangeError('Expected ' + (+a) + ' between ' + (+b) + ' and ' + (+c));
  },

  'assert/numeric:': function(_, a) {
    if (a.number == null)
      throw new TypeError("Expected a number.");
  },

  'assert/tuple:': function(_, a) {
    if (!Array.isArray(a.array))
      throw new TypeError('Expected a tuple.');
  },

  'assert/fail:': function(_, a) {
    throw new Error(a.string);
  },

  // ---- Reifying primitive types
  'text:': function(_, text) {
    return $text(text);
  },

  'integer:': function(_, value) {
    return $int(value);
  },

  'negative-integer:': function(_, value) {
    return $negInt(value);
  },

  'float:': function(_, value) {
    return $float(Number(value));
  },

  'tuple:': function(_, value) {
    return new _Tuple(value);
  },

  'method:': function(_, f) {
    return $makeFunction(f);
  },

  // ---- Primitive operations / syntax
  'true': function(){ return true; },
  'false': function(){ return false; },

  'failed?:': function(_, a) {
    return a == null;
  },

  'defer:': function(_, f) {
    setImmediate(function() {
      f.call();
    });
  },

  'refeq:and:': function(_, a, b) {
    return a === b;
  },

  'object:at:': function(_, object, key) {
    assert_text(key);
    return object[key.string];
  },

  'object:at:put:': function(_, object, key, value) {
    assert_text(key);
    object[key.string] = value;
  },

  'extend:with:': function(_, object, record) {
    $context.merge([$extendObject(object, objectToRecord(record, $context))]);
  },

  'while:do:': function(_, predicate, block) {
    while(predicate.call()) {
      block.call();
    }
  },

  'if:then:else:': function(_, test, consequent, alternate) {
    if (test) {
      return consequent;
    } else {
      return alternate;
    }
  },

  'throw:': function(_, error) {
    throw error;
  },

  'error:message:': function(_, name, message) {
    assert_text(name);
    assert_text(message);
    var e = new Error(message.string);
    e.name = name.string;
    return e;
  },

  'try:catch:': function(_, block, recover) {
    try {
      return block.call();
    } catch (e) {
      return recover.call(e);
    }
  },

  // ---- Branding
  'branding/brand:is:': function(_, a, b) {
    return a === b || isPrototypeOf.call(b, a);
  },

  'branding/object:has:': function(_, object, brand) {
    var xs = object[brands] || new Set();
    var iter = xs.values();
    var res;
    while (res = iter.next(), !res.done) {
      var x = res.value;
      if (brand === x || isPrototypeOf.call(brand, x)) {
        return true;
      }
    }
    return false;
  },

  'branding/object:attach:': function(_, object, brand) {
    var xs = object[brands];
    if (!xs)
      xs = object[brands] = new Set();
    xs.add(brand);
  },

  'branding/object:remove:': function(_, object, brand) {
    var xs = object[brands];
    if (xs)  xs.delete(brand);
  },

  // ---- Text
  'text:equals:': function(_, a, b) {
    return a.string === b.string;
  },

  'text:concat:': function(_, a, b) {
    return a.string + b.string;
  },

  'text:starts-with:': function(_, a, b) {
    return a.string.indexOf(b.string) === 0;
  },

  'text:ends-with:': function(_, a, b) {
    return a.string.lastIndexOf(b.string) === a.string.length - b.string.length;
  },

  'text:contains:': function(_, a, b) {
    return a.string.indexOf(b) != -1;
  },

  'text/length:': function(_, a) {
    return a.string.length;
  },

  'text:split:': function(_, a, b) {
    return new _Tuple(a.string.split(b.string).map($text));
  },

  'text/slice:from:to:': function(_, a, b, c) {
    return a.string.slice(Number(b.number) - 1, Number(c.number) - 1);
  },

  'text:at:': function(_, a, b) {
    return a.charAt(Number(b) - 1);
  },

  'text/char-code:': function(_, a) {
    return a.charCodeAt(0);
  },

  'text/from-code:': function(_, a) {
    return String.fromCharCode(a.number);
  },

  // ---- Numeric
  'integer:equals:': function(_, a, b) {
    return a.number.eq(b.number);
  },

  'integer/compare:to:less-than:equal:greater-than:': function(_, n, m, lt, eq, gt) {
    var vn = n.number, vm = m.number;
    var cmp = vn.cmp(vm);
    return cmp < 0?  lt
    :      cmp > 0?  gt
    :      /* _ */   eq;
  },

  'integer:less-than:': function(_, n, m) {
    return n.number.lt(m.number);
  },

  'integer:greater-than:': function(_, n, m) {
    return n.number.gt(m.number);
  },

  'integer:plus:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (typeof vm === "number" && !Number.isInteger(vm)) {
      return $float(vn.toNumber() + vm);
    } else {
      return $int(vn.add(vm));
    }
  },

  'integer:times:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (typeof vm === "number" && !Number.isInteger(vm)) {
      return $float(vn.toNumber() * vm);
    } else {
      return $int(vm.mul(vm));
    }
  },

  'integer:minus:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (typeof vm === "number" && !Number.isInteger(vm)) {
      return $float(vn.toNumber() - vm);
    } else {
      return $int(vm.sub(vm));
    }
  },

  'integer:float-division:': function(_, n, m) {
    return $float(n.number / m.number);
  },

  'integer:divide:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (Number(vm) === 0) throw new Error("Division by 0");
    return $int(vn.div(vm));
  },

  'integer/absolute:': function(_, n) {
    return $int(n.number.abs());
  },

  'integer:power:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (typeof vm === "number" && !Number.isInteger(vm)) {
      return $float(Math.pow(vn.toNumber(), vm));
    } else {
      return $int(vn.pow(vm));
    }
  },

  'integer:modulo:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (Number(vm) === 0) throw new Error("Division by 0");
    return $int(vn.mod(vm));
  },

  'integer->float:': function(_, n) {
    return $float(n.number.toNumber());
  },

  'float->integer:': function(_, n) {
    return $int(n.number);
  },

  'integer->string:': function(_, n) {
    return separateThousands(n.number.toString(), ',');
  },

  'float->string:': function(_, n) {
    var components = String(n.number).split('.');
    var integer    = components[0] || 0;
    var fractional = components[1] || 0;
    return separateThousands(integer, ',') + '.' + fractional;
  },

  'float:equals:': function(_, n, m) {
    return n.number === Number(m.number);
  },

  'float:not-equals:': function(_, n, m) {
    return n.number !== Number(m.number);
  },

  'float:compare:to:less-than:equal:greater-than:': function(_, n, m, lt, eq, gt) {
    var vn = n.number, vm = Number(m.number);
    return vn < vm?     lt
    :      vn > vm?     gt
    :      vm === vm?   eq
    :      /* _ */      false;
  },

  'float:less-than:': function(_, n, m) {
    return n.number < Number(m.number);
  },

  'float:greater-than:': function(_, n, m) {
    return n.number > Number(m.number);
  },

  'float:plus:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (BigNum.isBigNum(vm) && Number.isInteger(vn)) {
      return $int(BigNum(vn).add(vm));
    } else {
      return $float(vn + Number(vm));
    }
  },

  'float:minus:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (BigNum.isBigNum(vm) && Number.isInteger(vn)) {
      return $int(BigNum(vn).sub(vm));
    } else {
      return $float(vn - Number(vm));
    }
  },

  'float:times:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (BigNum.isBigNum(vm) && Number.isInteger(vn)) {
      return $int(BigNum(vn).mul(vm));
    } else {
      return $float(vn * Number(vm));
    }
  },

  'float:power:': function(_, n, m) {
    var vn = n.number, vm = m.number;
    if (BigNum.isBigNum(vm) && Number.isInteger(vn)) {
      return $int(BigNum(vn).pow(vm));
    } else {
      return $float(Math.pow(vn, Number(vm)));
    }
  },

  'float:absolute:': function(_, n) {
    return $float(Math.abs(n));
  },

  'float:division:': function(_, n, m) {
    return $float(n.number / Number(m.number));
  },

  'float:integer-division:': function(_, n, m) {
    if (Number(m.number) === 0)  throw new Error("Division by zero.");
    return $int(BigNum(n.number).div(m));
  },

  'float:modulo:': function(_, n, m) {
    if (Number(m.number) === 0)  throw new Error("Division by zero.");
    return $int(BigNum(n.number).mod(m));
  },

  'float/is-integer:': function(_, n) {
    return Number.isInteger(n.number);
  },

  // ---- Tuples
  'tuple:at:': function(_, a, k) {
    return a.array[Number(k.number) - 1];
  },

  'tuple:concat:': function(_, a, b) {
    return new _Tuple(a.array.concat(b.array));
  },

  'tuple/size:': function(_, a) {
    return $int(a.array.length);
  },

  'tuple:each:': function(_, a, f) {
    var arr = a.array;
    for (var i = 0; i < arr.length; ++i)  f.call(arr[i]);
  },

  'tuple:map:': function(_, a, f) {
    var arr = a.array;
    var r = [];
    for (var i = 0; i < arr.length; ++i) r[i] = f.call(arr[i]);
    return new _Tuple(r);
  },

  'tuple:chain:': function(_, a, f) {
    var arr = a.array;
    var r = [];
    for (var i = 0; i < arr.length; ++i) {
      var t = f.call(arr[i]);
      if (!Array.isArray(t.array)) {
        throw new TypeError("Expected a tuple.");
      }
      r.push.apply(r, t.array);
    }
    return r;
  },

  'tuple:filter:': function(_, a, f) {
    var arr = a.array;
    var r = [];
    for (var i = 0; i < arr.length; ++i) {
      var v = arr[i];
      if (f.call(v))  r.push(v);
    }
    return r;
  },

  'tuple:fold:from:': function(_, a, f, b) {
    var arr = a.array;
    for (var i = 0; i < arr.length; ++i)
      b = f.call(b, arr[i]);
    return b;
  },

  'tuple:fold-right:from:': function(_, a, f, b) {
    var arr = a.array;
    for (var i = arr.length - 1; i > 0; i--)
      b = f.call(b, arr[i]);
    return b;
  },

  'tuple/reverse:': function(_, a) {
    return new _Tuple(a.array.slice().reverse());
  },

  'tuple:sort:': function(_, a, f) {
    return new _Tuple(a.array.sort(function(a, b) {
      return Number(f.call(a, b).number);
    }));
  },

  'tuple:push:': function(_, a, b) {
    a.array.push(b);
  },

  // ---- Reflection
  'global-context': function(_) {
    return $context;
  },

  'reflect/methods:context:': function(_, object, context) {
    var methods = [];
    var c = context;
    while (c != null) {
      var box = c.get(object) || {};
      var names = keys(box);
      for (var i = 0; i < names.length; ++i) {
        var name = names[i];
        methods.push(new _Tuple([new _Text(name), object[box[name]]]));
      }
      c = c.parent;
    }
    return new _Tuple(methods);
  },

  'reflect/method-selector:on:in:': function(_, name, object, context) {
    var symbol = context.lookup(object, name);
    if (symbol) {
      return new _Selector(symbol);
    } else {
      return null;
    }
  },

  'reflect/method-for-selector:on:': function(_, name, object) {
    return object[name.symbol];
  },

  'reflect/parent:': function(_, object) {
    return prototypeOf(object);
  },

  'meta:at:': function(_, object, name) {
    return $meta.get(object, name.string);
  },

  'meta:at:put:': function(_, object, name, value) {
    $meta.set(object, name.string, value);
  },

  // ---- JS operations
  'js/to-string:': function(_, a) {
    return showJs(a);
  },

  'js/type:switch:': function(_, a, pattern) {
    if (a == null)
      return pattern.send0($context, 'null');

    if (isNumber(a))
      return pattern.send0($context, 'number');

    if (isString(a))
      return pattern.send0($context, 'string');

    if (isBoolean(a))
      return pattern.send0($context, 'boolean');

    if (Array.isArray(a))
      return pattern.send0($context, 'array');

    if (BigNum.isBigNum(a))
      return pattern.send0($context, 'big-num');

    if (isPrototypeOf.call(Siren_Object, a))
      return pattern.send0($context, 'siren');

    if (a instanceof Symbol)
      return new _Selector(a);

    return pattern.send0($context, 'object');
  },

  'js/global': function(_) {
    return typeof window !== 'undefined'?  window
    :      /* otherwise */                 global;
  },

  'js/new:': function(_, a) {
    return new a();
  },

  'js/new:with-arguments:': function(_, Ctor, xs) {
    var a = Object.create(Ctor.prototype);
    var b = Ctor.apply(a, xs);
    return Object(b) === b? b : a;
  },

  'js:invoke:with-arguments:': function(_, a, b, c) {
    return a[b].apply(a, c);
  },

  'js:apply:': function(_, a, b) {
    if (!Array.isArray(b))
      throw new TypeError("Expected argument array.");
    return a.apply(a, b);
  },

  'js:at:': function(_, a, b) {
    return a[b];
  },

  'js:has:': function(_, a, b) {
    return b in a;
  },

  'js/null': function(_) {
    return null;
  },

  'js/unwrap-selector:': function(_, a) {
    return a.symbol;
  },

  'unwrap-number:': function(_, a) {
    return a.number;
  },

  'unwrap-tuple:': function(_, a) {
    return a.array;
  },

  'unwrap-block:': function(_, a) {
    return a.call;
  },

  'unwrap-method:': function(_, a) {
    return a.call;
  },

  'unwrap-text:': function(_, a) {
    return a.string;
  },

  // ---- Debugging
  'debug/text:concat:': function(_, a, b) {
    assert_textual(b);
    return new _DebugText(a.string + b.string);
  },

  'debug/text:equals:': function(_, a, b) {
    assert_textual(b);
    return a.string === b.string;
  },

  'debug/show:tag:': function(_, a, b) {
    assert_text(b);
    try {
      console.log(b.string, a.send0($context, 'describe').string);
    } catch(e) {
      console.log(b.string, showJs(a));
    }
  },

  // ---- Console
  'console/write:': function(_, text) {
    process.stdout.write(text.string);
  },
  'console/error:': function(_, text) {
    process.stderr.write(text.string);
  }
});

// -- The Siren part of the runtime ------------------------------------
require('./Reflection')(Siren, Primitives);
require('./Core')(Siren, Primitives);
require('./Traits')(Siren, Primitives);
require('./Basic-Types')(Siren, Primitives);
require('./Text')(Siren, Primitives);
require('./Numeric')(Siren, Primitives);
require('./Collections')(Siren, Primitives);
require('./Debug')(Siren, Primitives);
require('./JS')(Siren, Primitives);
require('./Concurrency')(Siren, Primitives);
require('./Console')(Siren, Primitives);
require('./Testing')(Siren, Primitives);

// -- Exports ----------------------------------------------------------
module.exports = Siren;
