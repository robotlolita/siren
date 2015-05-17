// # module: FFI
//
// Provides a way for JavaScript and Mermaid to talk to each other, respecting
// each other's semantics.
module.exports = function(Mermaid) {

  var $send = Mermaid.$send;
  var $methods = Mermaid.$methods;

  // -- Helpers --------------------------------------------------------
  var classOf = Object.prototype.toString;
  var isString = require('is-string');
  var isNumber = require('is-number-object');
  var isBoolean = require('is-boolean-object');
  function isFunction(a) {
    return typeof a === 'function';
  }
  function isNamespace(a) {
    return Object.getPrototypeOf(Mermaid.$methods).isPrototypeOf(a)
  }
  function isPrimitive(a) {
    return isNumber(a)
        || isBoolean(a)
        || isString(a)
        || isFunction(a)
        || Array.isArray(a)
  }

  // -- Wrapper --------------------------------------------------------
  var $unpack = Symbol('js->mermaid');
  function wrap(instance, namespace) {
    var wrapper = {
      send: function(message, args) {
        return wrap(
          instance[Mermaid.$send](message, namespace, args),
          namespace
        )
      }
    };
    wrapper[$unpack] = function() {
      return instance
    };
    return wrapper;
  }

  // -- Module ---------------------------------------------------------
  var FFI = {
    'import:': Mermaid.$fn(function(anObject) {
      return anObject == null?         Mermaid.$globals.unit
      :      isString(anObject)?       String(anObject)
      :      isBoolean(anObject)?      Boolean(anObject)
      :      isNumber(anObject)?       Number(anObject)
      :      isFunction(anObject)?     anObject
      :      Array.isArray(anObject)?  anObject.map(FFI['import:'])
      :      anObject[$unpack]?        anObject[$unpack]()
      :      /* otherwise */           Mermaid.$toDict(anObject)
    }, {
      name: 'import:',
      arguments: ['anObject'],
      filename: '<built-in>',
      source: '<native>'
    }),

    'invoke:in:with:': Mermaid.$fn(function(aFunction, anObject, anArray) {
      return aFunction.apply(anObject, anArray)
    }, {
      name: 'invoke:in:with:',
      arguments: ['aFunction', 'anObject', 'anArray'],
      filename: '<built-in>',
      source: '<native>'
    }),

    'send:to:with:': Mermaid.$fn(function(aMessage, anObject, anArray) {
      return anObject[aMessage].apply(anObject, anArray)
    }, {
      name: 'send:to:with:',
      arguments: ['aMessage', 'anObject', 'anArray'],
      filename: '<built-in>',
      source: '<native>'
    }),

    'set:in:to:': Mermaid.$fn(function(aString, anObject, aValue) {
      anObject[aString] = aValue;
      return anObject
    }, {
      name: 'set:in:to:',
      arguments: ['aString', 'anObject', 'avalue'],
      filename: '<built-in>',
      source: '<native>'
    }),

    'export:': Mermaid.$fn(function(anObject) {
      return anObject === Mermaid.$globals.unit?  null
      :      isPrimitive(anObject)?               anObject
      :      /* otherwise */                      wrap(anObject, Mermaid.$methods)
    }, {
      name: 'export:',
      arguments: ['anObject']
    }),

    'export:in:': Mermaid.$fn(function(anObject, aNamespace) {
      if (!isNamespace(aNamespace))
        throw new TypeError("The namespace argument for export:in: must be a valid Mermaid namespace.");

      return wrap(anObject, aNamespace)
    }, {
      name: 'export:in:',
      arguments: ['anObject', 'aNamespace']
    })
  };

  return Mermaid.$make(FFI);

}
