// # module: mermaid
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./parser').MermaidParser;
var { generate, BindingBox } = require('./codegen');
var escodegen = require('escodegen');
var path = require('path');
var fs = require('fs');
var vm = require('vm');

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

exports.makeRuntime = makeRuntime;
function makeRuntime() {
  var prelude = path.join(__dirname, '../runtime/core.js');
  return require(prelude);
}

exports.run = run;
function run(source, runtime, filename) {
  global.Mermaid = runtime;
  vm.runInThisContext(source, { filename: filename });
}

exports.compile = parse ->> toJsAst ->> generateJs;
