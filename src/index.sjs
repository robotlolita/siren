// # module: mermaid
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./parser').MermaidParser;
var { generate, BindingBox } = require('./codegen');
var escodegen = require('escodegen');

exports.parse = parse;
function parse(text) {
  return Parser.matchAll(text, 'program');
}

exports.toJsAst = toJsAst;
function toJsAst(ast) {
  return generate(new BindingBox(), ast);
}

exports.generateJs = generateJs;
function generateJs(ast) {
  return escodegen.generate(ast.toObject());
}

exports.compile = parse ->> toJsAst ->> generateJs;
