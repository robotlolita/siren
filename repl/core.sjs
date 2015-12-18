/**********************************************************************
 *
 * This source file is part of the Siren project.
 *
 * Copyright (C) 2013-2015 Quildreen Motta.
 * Licensed under the MIT licence.
 *
 * See LICENCE for licence information.
 * See CONTRIBUTORS for the list of contributors to the project.
 *
 **********************************************************************/

// # module: Siren.repl.core
//
// The REPL module.

// -- Dependencies -----------------------------------------------------
var { toJsAst, generateJs, makeRuntime } = require('../');
var { Expr } = require('../lib/language/ast');
var Parser   = require('../lib/language/parser').SirenParser;
var readline = require('readline');
var colours  = require('chalk');
var path     = require('path');
var vm       = require('vm');

var faded  = colours.gray;
var error  = colours.red;
var result = colours.cyan;

// -- Helpers ----------------------------------------------------------
function showError(e, options) {
  if (e) {
    console.log(error(e));
    if (options.verbose) console.log(faded(e.stack));
  }
}

function maybeLog(runtime, options, a) {
  if (a != null) show(runtime, options, a);
}

function show(runtime, options, a) {
  try {
    console.log(faded('=>'), a.send0(runtime.$context, 'describe').toString());
  } catch(e) {
    if (options.verbose) {
      console.log(faded('*** Failed to send `describe` to:'), a);
      showError(e, options);
    }
  }
}

function requireWithPath(origin) {
  return function(file) {
    return (/^\./.test(file))?  require(path.join(origin, file))
    :      /* otherwise */      require(file);
  }
}

function flatten(xss) {
  return xss.reduce(λ[# +++ #], [])
}

function collect(node) {
  return match node {
    Expr.Let(_, Expr.Id(_, name), _) =>
      [name],

    Expr.Seq(_, xs) =>
      collect(xs),

    n @ Array => flatten(n.map(collect)),
    n => []
  }
}

function replContext(runtime) {
  var req = requireWithPath(process.cwd());
  var mod = runtime.$makeModule({ filename: '<repl>' }, req, runtime);
  return vm.createContext({
    process: process,
    console: console,
    require: req,
    setImmediate: setImmediate,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    '$Siren': runtime,
    '$methods': mod.context,
    '_Module': mod,
    __dirname: process.cwd()
  });
}

// -- Evaluation helpers -----------------------------------------------
function loopEvaluation(names, runtime, context, rl, options) {
  rl.question('> ', function(program) {
    finishReplLoop(names, runtime, context, rl, program, options);
  });
}

function finishReplLoop(names, runtime, context, rl, program, options) {
  evaluateCommand(names, runtime, context, rl, program, options);
}

function continueRepl(err, names, runtime, context, rl, program, options) {
  rl.question('... ', function(newProgram) {
    if (!newProgram.trim()) {
      showError(err, options);
      loopEvaluation(names, runtime, context, rl, options);
    } else {
      finishReplLoop(names, runtime, context, rl, program + '\n' + newProgram, options);
    }
  });
}

function evaluateCommand(names, runtime, context, rl, program, options) {
  return program === ':quit'?  process.exit(0)
  :      /* otherwise */       run(names, runtime, context, rl, program, options);
}

function run(names, runtime, context, rl, program, options) {
  if (!(program || '').trim()) {
      return continueRepl(null, names, runtime, context, rl, program, options);
  }

  try {
    var ast = Parser.matchAll(program.trim(), 'replExpr');
  } catch (e) {
    return continueRepl(e, names, runtime, context, rl, program, options);
  }

  try {
    var newNames = collect(ast);
    var allNames = names +++ newNames;
    var code = toJsAst(ast, allNames);
    var js   = generateJs(code);
    if (options.showJs)  console.log(faded(js));
  } catch(e) {
    showError(e, options);
    return loopEvaluation(names, runtime, context, rl, options);
  }

  try {
    var result = runProgram(runtime, context, js);
    maybeLog(runtime, options, result);
    loopEvaluation(allNames, runtime, context, rl, options);
  } catch(e) {
    showError(e, options);
    loopEvaluation(names, runtime, context, rl, options);
  }
}

function runProgram(runtime, context, js) {
  return vm.runInContext(js, context, '<repl>');
}


// -- Main entrypoint --------------------------------------------------
function repl(options) {
  console.log('Type :quit to exit (or ^D).');
  console.log('');
  var runtime = makeRuntime();
  var context = replContext(runtime);

  loopEvaluation( ['Module']
                , runtime
                , context
                , readline.createInterface({ input: process.stdin
                                           , output: process.stdout })
                , options)
}

module.exports = repl;
