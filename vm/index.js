// # module: mermaid.cli
//
// Command line interface for the Mermaid compiler.
var doc = [
        'Mermaid \u2014 A simple prototypical OO language for teaching.',
        '',
        'Usage:',
        '  mermaid [options] <file>',
        '  mermaid [options]',
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
var __ref = require('../');
var parse = __ref.parse;
var compile = __ref.compile;
var runInVm = __ref.run;
var makeRuntime = __ref.makeRuntime;
// -- Helpers ----------------------------------------------------------
var log = console.log.bind(console);
var show = function (a) {
    return log(inspectComplex(a));
};
var read = function (a) {
    return fs.readFileSync(a, 'utf-8');
};
var ast = function (a) {
    return parse(read(a));
};
var js = function (a) {
    return compile(read(a));
};
var run = function (f) {
    return function (a) {
        return runInVm(a, makeRuntime(), path.resolve(f));
    }(js(f));
};
var runStdin = function (s) {
    return runInVm(compile(s), makeRuntime(), '<stdin>');
};
function inspectComplex(a0) {
    if (typeof a0 === 'string' || Object.prototype.toString.call(a0) === '[object String]') {
        var a = a0;
        return a;
    }
    if (a0 == null) {
        var a = a0;
        return '';
    }
    var any = a0;
    return inspect(any);
}
function readStdin() {
    return fs.readFileSync('/dev/stdin').toString();
}
function branch(args, f, g) {
    return args['<file>'] ? g(args['<file>']) : f(readStdin());
}
// -- Main -------------------------------------------------------------
module.exports = function Main() {
    var args = docopt(doc, { help: false });
    ;
    args['--help'] ? log(doc) : args['--version'] ? log('Mermaid version ' + pkg.version) : args['--ast'] ? show(branch(args, parse, ast)) : args['--compile'] ? show(branch(args, compile, js)) : branch(args, runStdin, run);
};