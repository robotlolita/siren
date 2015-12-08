// # module: siren
//
// A small object oriented language for teaching.

// -- Dependencies -----------------------------------------------------
var Parser = require('./language/parser').SirenParser;
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
function toJsAst(ast, knownNames) {
  return generate(ast, knownNames || []);
}

exports.generateJs = generateJs;
function generateJs(ast) {
  return escodegen.generate(ast.toObject());
}

exports.makeRuntime = makeRuntime;
function makeRuntime() {
  installExtensions();
  var prelude = path.join(__dirname, '../runtime');
  return require(prelude);
}

exports.run = run;
function run(source, runtime, filename) {
  if (filename && filename !== '<stdin>') {
    return require(filename)(runtime)
  } else {
    var module = { exports: { } };
    vm.runInNewContext(source, { filename: filename, module: module });
    return module.exports(runtime);
  }
}

exports.installExtensions = installExtensions;
function installExtensions() {
  if (!require.extensions['.siren']) {
    require.extensions['.siren'] = function(module, filename) {
      var code = fs.readFileSync(filename, 'utf8');
      module._compile(compile(code), filename);
    };
  }
}

var compile = exports.compile = parse ->> toJsAst ->> generateJs;
