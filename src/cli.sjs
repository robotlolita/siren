// # module: mermaid.cli
//
// Command line interface for the Mermaid compiler.

var doc = [
  'Mermaid — A simple prototypical OO language for teaching.',
  '',
  'Usage:',
  '  mermaid [options] <file>',
  '  mermaid --version',
  '  mermaid --help',
  '',
  'Options:',
  '  -c, --compile              Outputs the generated JS code on the stdout',
  '  -a, --ast                  Displays the AST instead of running',
  '  -h, --help                 Displays this screen',
  '  --version                  Displays the version number'
].join('\n');

// -- Dependencies -----------------------------------------------------
var docopt = require('docopt').docopt;
var inspect = require('core.inspect');
var pkg = require('../package.json');
var fs = require('fs');
var path = require('path');
var { parse, compile, run:runInVm } = require('./');


// -- Helpers ----------------------------------------------------------
var log     = console.log.bind(console);
var show    = inspectComplex ->> log;
var read    = λ a -> fs.readFileSync(a, 'utf-8');
var prelude = λ[read(path.join(__dirname, '../runtime/core.js'))];
var ast     = read ->> parse;
var js      = read ->> compile;
var run     = λ(f) -> js(f) |> λ[prelude() + #] |> λ[runInVm(#, f)];

function inspectComplex {
  a @ String => a,
  any        => inspect(any)
}

// -- Main -------------------------------------------------------------
module.exports = function Main() {
  var args = docopt(doc, { help: false });

  ; args['--help']?                     log(doc)
  : args['--version']?                  log('Mermaid version ' + pkg.version)
  : args['--ast']?                      show(ast(args['<file>']))
  : args['--compile']?                  log(js(args['<file>']))
  : /* otherwise */                     show(run(args['<file>']))
}

