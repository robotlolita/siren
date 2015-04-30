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
  function isNumber(a) {
    return classOf.call(a) === '[object Number]';
  }
  function isBoolean(a) {
    return classOf.call(a) === '[object Boolean]';
  }
  function isFunction(a) {
    return typeof a === 'function';
  }
  function isNamespace(a) {
    return Object.getPrototypeOf(Mermaid.$methods).isPrototypeOf(a)
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

    'export:': Mermaid.$fn(function(anObject) {
      return wrap(anObject, Mermaid.$methods)
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
