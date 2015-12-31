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

// # module: siren/vm/runtime
//
// Runtime objects for the Siren VM.

// -- Macros -----------------------------------------------------------
macro (#pop) {
  rule { ($vm) } => {
    $vm.stack.pop()
  }
}

macro (#push) {
  rule { ($vm, $args:expr (,) ...) } => {
    $vm.stack.push($args (,) ...)
  }
}

macro (#toString) {
  case { _ ($toks ...) } => {
    return [makeValue(#{ $toks ... }.map(unwrapSyntax).join(' '), #{ here })];
  }
}

macro (#localDefine) {
  rule { $vm ($rest:ident (,) ... $arg:ident) } => {
    var $arg = #pop($vm);
    #localDefine $vm ($rest (,) ...)
  }
  rule { $vm ($arg:ident) } => {
    var $arg = #pop($vm);
  }
  rule { $vm () } => {}
}

macro (#collectArgs) {
  case { _ $scope ($arg:ident, $rest:ident (,) ...) } => {
    var Text = makeIdent("Text", #{$scope});
    letstx $Text = [Text];
    return #{
      new $Text(#toString($arg)), #collectArgs $scope ($rest (,) ...)
    }
  }

  case { _ $scope ($arg:ident) } => {
    var Text = makeIdent("Text", #{$scope});
    letstx $Text = [Text];
    return #{
      new $Text(#toString($arg))
    }
  }

  case { _ $scope () } => {
    return #{};
  }
}

macro (#extend) {
  case {
    $scope
    $object:ident {
      $(
        meta $meta:expr
        def $name ($vm:ident, $args:ident (,) ...) {
          $body ...
        }
      ) ...
    }
  } => {
    var define = makeIdent("define", #{$scope});
    letstx $define = [define];
    return #{
      $(
        $define($object, #toString($name), [#collectArgs $scope ($args (,) ...)], $meta, function($vm) {
          #localDefine $vm ($args (,) ...)
          $body ...
        });
      ) ...
    }
  }
}


// -- Dependencies -----------------------------------------------------
var bignum = require('bignum');


// -- Constants --------------------------------------------------------
var PRIMITIVE = true;

// -- Aliases ----------------------------------------------------------
var prototypeOf   = Object.getPrototypeOf;
var isPrototypeOf = Object.prototype.isPrototypeOf;
var keys          = Object.keys;
var clone         = Object.create;


// -- Helpers ----------------------------------------------------------

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

// ### function: objectToRecord(object, context)
// Converts an object (in a context) to a plain JS object.
//
// @type: (Object, Context) -> { String -> Any }
function objectToRecord(object, context) {
  var box = context.get(object) || {};
  var r = {};
  keys(box).forEach(function(key) {
    r[key] = object[box[key]];
  });
  return r;
}

// ### function: compact(object)
// Remove undefined properties from an object.
//
// @type: (Object) -> Object
function compact(object) {
  return Object.keys(object).reduce(function(r, k) {
    var value = object[k];
    if (value != null)  r[k] = value;
    return r;
  }, {});
}


module.exports = function() {

  function define(object, name, args, meta, fn) {
    var selector = Symbol(name);
    var method = new Method(null, globalContext);
    method.isPrimitive = true;
    method.primitive = fn;
    method.scope = globalScope;
    method.context = globalContext;
    method.belongsTo = object;
    object[selector] = method;
    globalContext.define(object, name, selector);
    globalMeta.update(method, meta);
    globalMeta.set(method, "name", new Text(name));
    globalMeta.set(method, "arguments", args);
    globalMeta.set(method, "source", new Text("(native method)\n" + fn.toString()));
  }

  function extendObject(object, record) {
    var mapping = {};
    var ks = keys(record);
    for (var i = 0; i < ks.length; ++i) {
      var key = ks[i];
      var selector = Symbol(key);
      var method = record[key];
      object[selector] = method;
      mapping[key] = selector;
      method.belongsTo = object;
      globalMeta.update(method, compact({
        'authors': globalMeta.get(object, 'authors'),
        'licence': globalMeta.get(object, 'licence'),
        'platforms': globalMeta.get(object, 'platforms'),
        'repository': globalMeta.get(object, 'repository'),
        'stability': globalMeta.get(object, 'stability'),
        'portability': globalMeta.get(object, 'portability')
      }));
    }

    return [object, mapping];
  }


  // -- The hierarchy of Siren objects -----------------------------------
  var Siren_Object = clone(null);

  var Siren_Scope       = clone(Siren_Object);
  var Siren_Module      = clone(Siren_Object);
  var Siren_Context     = clone(Siren_Object);
  var Siren_Perspective = clone(Siren_Object);
  var Siren_Selector    = clone(Siren_Object);
  var Siren_Message     = clone(Siren_Object);

  var Siren_Text      = clone(Siren_Object);
  var Siren_DebugText = clone(Siren_Object);
  var Siren_Numeric   = clone(Siren_Object);
  var Siren_Integer   = clone(Siren_Numeric);
  var Siren_Float     = clone(Siren_Numeric);
  var Siren_Tuple     = clone(Siren_Object);

  var Siren_Block  = clone(Siren_Object);
  var Siren_Method = clone(Siren_Object);


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
  Meta::get = function(object, name) {
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
  Meta::set = function(object, name, value) {
    if (name != null) {
      var metas = this.data.get(object) || {};
      metas[name] = value;
      this.data.set(object, metas);
    }
  };

  Meta::update = function(object, meta) {
    var oldMeta = this.data.get(object) || {};
    this.data.set(object, extend(oldMeta, meta));
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
  Context::set = function(object, value) {
    this.mappings.set(object, value);
  };

  // #### method: get(object)
  //
  // Returns the mapping for the given object.
  //
  // @type: Siren.Object -> { String -> Symbol }
  Context::get = function(object) {
    return this.mappings.get(object);
  };

  // #### method: lookup(object, name)
  //
  // Retrieves the selector value for the object / name pair provided.
  // Looks up in the whole prototype chain of the object before falling
  // back to the parent (Context) scope.
  //
  // @type: (Siren.Object, String) -> Symbol | null
  Context::lookup = function(object, name) {
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

  // #### method: define(object, name, selector)
  // Defines a new mapping for the object.
  //
  // @type: Object, String, Symbol -> null
  Context::define = function(object, name, selector) {
    var box = this.get(object) || {};
    box[name] = selector;
    this.set(object, box);
  };

  // #### method: merge(...traits)
  //
  // Adds a series of traits to the mappings in this method box.
  //
  // @type: (...(Object, { String -> Symbol })) -> null
  Context::merge = function(pairs) {
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
  Context::clone = function() {
    return new Context(this);
  };


  // -- Defines how internal objects are constructed ---------------------

  // ### class: Perspective
  // Represents a perspective from extending an object.
  //
  // @type: new (Object, { String -> Symbol }) -> Perspective
  function Perspective(object, mappings) {
    this.object   = object;
    this.mappings = mappings;
  }
  Perspective.prototype = Siren_Perspective;


  // ### class: Selector
  // Represents a message selector. Only reified through reflection.
  //
  // @type: new (Symbol) -> Selector
  function Selector(symbol) {
    this.symbol = symbol;
  }
  Selector.prototype = Siren_Selector;


  // ### class: Message
  // Represents a message send. Only reified on message send errors.
  //
  // @type: new (String, Array(Object), Context) -> Message
  function Message(name, args, context) {
    this.name = name;
    this.args = args;
    this.context = context;
  }
  Message.prototype = Siren_Message;


  // ### class: Text
  // Represents plain text.
  //
  // @type: new (String) -> Text
  function Text(string) {
    this.string = string;
  }
  Text.prototype = Siren_Text;
  Text::string = "";


  // ### class: DebugText
  // Represents text exclusively for debugging.
  //
  // @type: new (String) -> DebugText
  function DebugText(string) {
    this.string = string;
  }
  DebugText.prototype = Siren_DebugText;
  DebugText::string = "";


  // ### class: Integer
  // Represents an arbitrary-precision integer.
  //
  // @type: new (BigNum) -> Integer
  function Integer(number) {
    this.number = number;
  }
  Integer.prototype = Siren_Integer;
  Integer::number = bignum(0);


  // ### class: Float
  // Represents a 64-bits float.
  //
  // @type: new (Number) -> Float
  function Float(number) {
    this.number = number;
  }
  Float.prototype = Siren_Float;
  Float::number = 0;


  // ### class: Tuple
  // Represents an immutable sequence of objects.
  //
  // @type: new (Array(Object)) -> Tuple
  function Tuple(array) {
    this.array = array;
  }
  Tuple.prototype = Siren_Tuple;
  Tuple::array = [];


  // ### class: Method
  // Represents a method.
  //
  // @type: new (Scope, Context) -> Method
  function Method(parentScope, parentContext) {
    // Primitive methods
    this.isPrimitive = false;
    this.primitive = null;

    // Siren methods
    this.baseInstructionPointer = null;
    this.endInstructionPointer = null;

    // Both
    this.scope = clone(parentScope);
    this.context = new Context(parentContext);
    this.belongsTo = null;
  }
  Method.prototype = Siren_Method;


  function Module(filename) {
    this.filename = filename;
  }
  Module.prototype = Siren_Module;


  // -- Globals ----------------------------------------------------------
  var globalMeta = new Meta();
  var globalContext = new Context(null);
  var globalScope = clone(Siren_Scope);
  var globalModule = new Module();

  // -- Initialisation -------------------------------------------------
  globalModule.module = null;
  Siren_Object.module = globalModule;
  Siren_Scope.module = globalModule;
  Siren_Module.module = globalModule;
  Siren_Context.module = globalModule;
  Siren_Perspective.module = globalModule;
  Siren_Selector.module = globalModule;
  Siren_Message.module = globalModule;
  Siren_Text.module = globalModule;
  Siren_DebugText.module = globalModule;
  Siren_Numeric.module = globalModule;
  Siren_Integer.module = globalModule;
  Siren_Float.module = globalModule;
  Siren_Tuple.module = globalModule;
  Siren_Block.module = globalModule;
  Siren_Method.module = globalModule;


  // -- Defines primitive operations -------------------------------------
  #extend globalScope {
    meta {} def Object (vm, self) {
      #push(vm, Siren_Object);
    }

    meta {} def Scope (vm, self) {
      #push(vm, Siren_Scope);
    }

    meta {} def Module (vm, self) {
      #push(vm, Siren_Module);
    }

    meta {} def Context (vm, self) {
      #push(vm, Siren_Context);
    }

    meta {} def Perspective (vm, self) {
      #push(vm, Siren_Perspective);
    }

    meta {} def Selector (vm, self) {
      #push(vm, Siren_Selector);
    }

    meta {} def Message (vm, self) {
      #push(vm, Siren_Message);
    }

    meta {} def Text(vm, self) {
      #push(vm, Siren_Text);
    }

    meta {} def DebugText(vm, self) {
      #push(vm, Siren_DebugText);
    }

    meta {} def Numeric (vm, self) {
      #push(vm, Siren_Numeric);
    }

    meta {} def Integer (vm, self) {
      #push(vm, Siren_Integer);
    }

    meta {} def `Float-64bits` (vm, self) {
      #push(vm, Siren_Float);
    }

    meta {} def Block (vm, self) {
      #push(vm, Siren_Block);
    }

    meta {} def Method (vm, self) {
      #push(vm, Siren_Method);
    }
  }

  #extend Siren_Object {
    meta {
      "complexity": new Text("O(n), n is the number of visible properties in [[object]]")
    }
    def `refined-by:context:` (vm, self, object, context) {
      var record = objectToRecord(object, context);
      var result = clone(self);
      var pair = extendObject(result, record);
      globalContext.merge([pair]);
      #push(vm, self);
    }

    meta {
      "complexity": new Text("O(n), n is the number of visible properties in [[object]]")
    }
    def `extended-by:context:` (vm, self, object, context) {
      var record = objectToRecord(object, context);
      var pair = extendObject(self, record);
      #push(vm, new Perspective(pair[0], pair[1]));
    }

    meta {}
    def describe (vm, self) {
      var name = globalMeta.get(self, "name");
      var module = self.module? ' at ' + self.module.filename : '';
      var line = globalMeta.get(self, 'line');
      var col = globalMeta.get(self, 'column');
      var pos = line && col? ' line ' + line.number + ', column ' + column.number : '';
      #push(vm, new DebugText('<' + (name || 'Anonymous Object') + module + pos + '>'));
    }
  }

  #extend Siren_Scope {
    meta {}
    def describe (vm, self) {
      #push(vm, new DebugText('<Scope>'));
    }

    meta {}
    def Scope (vm, self) {
      #push(vm, self);
    }
  }


  // -- Exports --------------------------------------------------------
  return {
    meta: globalMeta,
    context: globalContext,
    scope: globalScope,
    module: globalModule,

    protos: {
      Object: Siren_Object,
      Scope: Siren_Scope,
      Context: Siren_Context,
      Perspective: Siren_Perspective,
      Selector: Siren_Selector,
      Message: Siren_Message,
      Text: Siren_Text,
      DebugText: Siren_DebugText,
      Numeric: Siren_Numeric,
      Integer: Siren_Integer,
      Float: Siren_Float,
      Tuple: Siren_Tuple,
      Block: Siren_Block,
      Method: Siren_Method
    },

    Perspective: Perspective,
    Selector: Selector,
    Message: Message,
    Text: Text,
    DebugText: DebugText,
    Integer: Integer,
    Float: Float,
    Tuple: Tuple,
    Method: Method
  }
}
