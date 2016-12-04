//----------------------------------------------------------------------
//
// This source file is part of the Siren project.
//
// See LICENCE for licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const doc = `Siren — A context-oriented language.

Usage:
  siren [options] <file>
  siren --version
  siren --help

Options:
  -h, --help                Displays this screen
  --version                 Displays the version number
`;


const docopt = require('docopt').docopt;
const fs = require('fs');
const path = require('path');
const { run } = require('./interpreter');
const pkg = require('../../package.json');


const read = (path) => fs.readFileSync(path, 'utf8');


const args = docopt(doc, { help: false });

  args['--help']?     console.log(doc)
: args['--version']?  console.log('Siren version', pkg.version)
: /* otherwise */     console.log(run(read(args['<file>'])));
