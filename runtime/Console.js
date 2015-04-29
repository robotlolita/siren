var $send    = Mermaid.$send;
var $methods = Mermaid.$methods;
var unit     = Mermaid.$globals.unit;

function toString(a) {
  return a[$send]('as-string', $methods, [])
}

var Console = {
    'log:': function(data) {
      console.log(toString(data));
      return unit;
    },
    'info:': function(data) {
      console.info(toString(data));
      return unit;
    },
    'warn:': function(data) {
      console.warn(toString(data));
      return unit;
    },
    'error:': function(data) {
      console.error(toString(data));
      return unit;
    },
    'trace:': function(data) {
      console.trace(toString(data));
      return unit;
    }
};

module.exports = Mermaid.$make(Console);