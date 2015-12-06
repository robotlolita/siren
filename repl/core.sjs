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
  console.log(error(e));
  if (options.verbose) console.log(faded(e.stack));
}

function maybeLog(runtime, options, a) {
  if (a != null) show(runtime, options, a);
}

function show(runtime, options, a) {
  try {
    console.log(faded('=>'), runtime.$send(a, 'as-string', runtime.$methods, []));
  } catch(e) {
    if (options.verbose) {
      console.log(faded('*** Failed to send `as-string` to:'), a);
      showError(e, options);
    }
  }
}

function requireWithPath(origin) {
  return function(file) {
    return require(path.join(origin, file));
  }
}

function replContext(runtime) {
  return vm.createContext({
    process: process,
    console: console,
    require: requireWithPath(process.cwd()),
    setImmediate: setImmediate,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    '$Siren': runtime,
    '$send': runtime.$send,
    '$methods': runtime.$methods,
    __dirname: process.cwd()
  });
}

// -- Evaluation helpers -----------------------------------------------
function loopEvaluation(runtime, context, rl, options) {
  rl.question('> ', function(program) {
    finishReplLoop(runtime, context, rl, program, options);
  });
}

function finishReplLoop(runtime, context, rl, program, options) {
  evaluateCommand(runtime, context, rl, program, options);
}

function continueRepl(err, runtime, context, rl, program, options) {
  rl.question('... ', function(newProgram) {
    if (!newProgram.trim()) {
      showError(err, options);
      loopEvaluation(runtime, context, rl, options);
    } else {
      finishReplLoop(runtime, context, rl, program + '\n' + newProgram, options);
    }
  });
}

function evaluateCommand(runtime, context, rl, program, options) {
  return program === ':quit'?  process.exit(0)
  :      /* otherwise */       run(runtime, context, rl, program, options);
}

function run(runtime, context, rl, program, options) {
  if (!(program || '').trim())  return;

  try {
    var ast = Parser.matchAll(program.trim(), 'stmt');
  } catch (e) {
    return continueRepl(e, runtime, context, rl, program, options);
  }

  try {
    var code = toJsAst(ast);
    var js   = generateJs(code);
    if (options.showJs)  console.log(faded(js));
  } catch(e) {
    showError(e, options);
    return loopEvaluation(runtime, context, rl, options);
  }

  try {
    var result = runProgram(runtime, context, js);
    maybeLog(runtime, options, result);
    loopEvaluation(runtime, context, rl, options);
  } catch(e) {
    showError(e, options);
    loopEvaluation(runtime, context, rl, options);
  }
}

function runProgram(runtime, context, js) {
  return vm.runInNewContext(js, context, '<repl>');
}


// -- Main entrypoint --------------------------------------------------
function repl(options) {
  console.log('Type :quit to exit (or ^D).');
  console.log('');
  var runtime = makeRuntime();
  var context = replContext(runtime);

  loopEvaluation( runtime
                , context
                , readline.createInterface({ input: process.stdin
                                           , output: process.stdout })
                , options)
}

module.exports = repl;
