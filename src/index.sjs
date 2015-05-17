// # module: mermaid
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./language/parser').MermaidParser;
var generate = require('./language/generation');
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
  return generate(ast);
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
  installExtensions(runtime);
  return filename && filename !== '<stdin>'?
    require(filename).exports
  : vm.runInThisContext(source, { filename: filename });
}

exports.installExtensions = installExtensions;
function installExtensions(runtime) {
  if (!require.extensions['.maid']) {
    require.extensions['.maid'] = function(module, filename) {
      var code = fs.readFileSync(filename, 'utf8');
      module._compile(compile(code), filename);
    };
  }
}

var compile = exports.compile = parse ->> toJsAst ->> generateJs;
