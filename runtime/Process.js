var $send    = Mermaid.$send;
var $methods = Mermaid.$methods;

var Process = {
    'exit': function() {
      process.exit();
      return unit
    },
    'exit:': function(errorCode) {
      process.exit(errorCode);
      return unit
    },
    'abort': function() {
      process.abort();
      return unit
    },
    'arguments': function() {
      return process.argv;
    },
    'execution-path': function() {
      return process.execPath;
    },
    'execution-arguments': function() {
      return process.execArgv;
    },
    'environment': function() {
      return Mermaid.$toDict(process.env);
    }
};

module.exports = Mermaid.$make(Process);