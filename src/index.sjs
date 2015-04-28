// # module: mermaid
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./parser').MermaidParser;
var { generate, BindingBox } = require('./codegen');
var escodegen = require('escodegen');
var vm = require('vm');
var path = require('path');

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

exports.run = run;
function run(code, filename) {
  filename = filename || '.';
  var context = vm.createContext({
    process: process,
    console: console,
    require: λ(p) -> /^\./.test(p)? require(path.join(filename, p)) : require(p),
    __dirname: path.dirname(path.resolve(filename)),
    module: { exports: {}, filename: filename }
  });

  return vm.runInNewContext(code, context, filename);
}

exports.compile = parse ->> toJsAst ->> generateJs;
