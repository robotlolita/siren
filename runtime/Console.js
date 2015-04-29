var $send    = Mermaid.$send;
var $methods = Mermaid.$methods;

function toString(a) {
  return a[$send]('as-string', $methods, [])
}

var Console = {
    'log:': function(data) {
      console.log(toString(data));
      return this;
    },
    'info:': function(data) {
      console.info(toString(data));
      return this;
    },
    'warn:': function(data) {
      console.warn(toString(data));
      return this;
    },
    'error:': function(data) {
      console.error(toString(data));
      return this;
    },
    'trace:': function(data) {
      console.trace(toString(data));
      return this;
    }
};

module.exports = Mermaid.$make(Console);