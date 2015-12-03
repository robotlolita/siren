Siren
=====

Siren is an experimental prototype-based object-oriented language. It
differs from existing languages in that it uses a single delegation slot
for sharing (and cheap instantiation), but allows controlled lexical
extensibility.


## Getting started

Install the Node.js 4.0.0+ (you'll need WeakMaps and Symbols), Make, and
Git. After that clone this repository, and run `make compile`. This will
generate a `bin/siren` compiler/interpreter.

```sh
$ git clone https://github.com/robotlolita/siren.git
$ cd siren
$ npm install
$ make all
$ bin/siren
```

You can run individual files with the same binary. There are examples in the
`examples/` folder:

```sh
$ bin/siren examples/trivial/hello-world.siren
```

You can compile things to plain JavaScript using the `--compile` flag, but
you'll need to include the proper runtime files and have the global `Siren`
name point to the runtime root object in order to run those files:

```sh
$ bin/siren --compile examples/trivial/hello-world.siren > hw.js
$ iojs -e "global.Siren = require('./runtime/core'); require('./hw.js')"
Hello, world
```

## More

 -  Feel free to ask [@robotlolita](https://twitter.com/robotlolita) anything
    related to this project on Twitter.

 -  Things will eventually be added to the Wiki, but also blogged about on
    http://robotlolita.me/
