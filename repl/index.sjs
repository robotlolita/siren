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

// # module: Siren.repl
//
// Command line interface for the Siren REPL.
var doc = [
  'isiren — command-line REPL for the Siren language.',
  '',
  'Usage:',
  '  isiren [options]',
  '  isiren --version',
  '  isiren --help',
  '',
  'Options:',
  '  -v, --verbose              Outputs lots of information',
  '  --show-js                  Shows compiled JS for each expression',
  '  -h, --help                 Displays this screen',
  '  --version                  Displays the version number'
].join('\n');


// -- Dependencies -----------------------------------------------------
var docopt = require('docopt').docopt;
var pkg    = require('../package.json');
var repl   = require('./core');
var show   = console.log.bind(console);


module.exports = function Main() {
  var args = docopt(doc, { help: false });

  ; args['--help']?     show(doc)
  : args['--version']?  show('iSiren version ' + pkg.version)
  : /* otherwise */     repl({
                          verbose: args['--verbose'],
                          showJs:  args['--show-js']
                        })
}

