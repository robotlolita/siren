// # module: mermaid
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./parser').MermaidParser;

exports.parse = parse;
function parse(text) {
  return Parser.matchAll(text, 'program');
}
