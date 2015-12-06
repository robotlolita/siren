Siren
=====

Siren is an experimental prototype-based object-oriented language. It
differs from existing languages in that it uses a single delegation slot
for sharing (and cheap instantiation), but allows controlled lexical
extensibility.


## Getting started

Siren's support for arbitrary-precision arithmetic uses the
[bignum](https://www.npmjs.com/package/bignum) library, so you'll need
to have a C++ compiler and the headers for the OpenSSL library.

Install the Node.js 4.0.0+ (you'll need WeakMaps and Symbols), Make, and
Git. After that clone this repository, and run `make compile`. This will
generate a `bin/siren` compiler/interpreter, and a REPL `bin/isiren`.

```sh
$ git clone https://github.com/robotlolita/siren.git
$ cd siren
$ npm install
$ make all
$ bin/siren
```

You can use the REPL to try out pieces of code interactively:

```sh
$ bin/isiren
Type :quit to exit (or ^D).

> 1 + 1
=> 2
```

You can run individual files with the same binary. There are examples in the
`examples/` folder:

```sh
$ bin/siren examples/trivial/hello-world.siren
```

You can compile things to plain JavaScript using the `--compile` flag, but
you'll need to pass the proper runtime to the module in order to run it:

```sh
$ bin/siren --compile examples/trivial/hello-world.siren > hw.js
$ node -e "require('./hw.js')(require('./runtime))"
Hello, world
```

## More

 -  Feel free to ask [@robotlolita](https://twitter.com/robotlolita) anything
    related to this project on Twitter.

 -  Things will eventually be added to the Wiki, but also blogged about on
    http://robotlolita.me/
