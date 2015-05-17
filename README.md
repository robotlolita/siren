Mermaid
=======

> **NOTE:**
> 
> THIS IS IN **SUPER EARLY PRE-ALPHA STAGE-KINDA THING** OF DEVELOPMENT. Some
> things work, some do not, most of the things are still in-flux/constantly
> changing, the feedback is horrible, and there are absolutely **no
> optimisations whatsoever**. But feel free to play around with it :3

Mermaid is an experiment on interactive programming platform. The idea is to
take a familiar tool for most programmers (the command line shell), and improve
both the ways people can interact with it, and the feedback provided by this
environment.

The idea isn't entirely new, inspiration comes from all kinds of things (Emacs,
TermKit, Lamdu, Lisp REPLs, Smalltalk interactive development platforms, etc).


## Getting started

Install io.js (**NOT** Node, Mermaid requires things like WeakMaps and Symbols,
which aren't in Node stable yet), Make, Git, clone this repository, then run
`make compile`, and run things with `bin/mermaid`.

```sh
$ git clone git://github.com:mermaid-language/mermaid.git
$ cd mermaid
$ npm install
$ make all
$ bin/mermaid
```

You can run individual files with the same binary. There are examples in the
`examples/` folder:

```sh
$ bin/mermaid examples/hello-world.maid
```

You can compile things to plain JavaScript using the `--compile` flag, but
you'll need to include the proper runtime files and have the global `Mermaid`
name point to the runtime root object in order to run those files:

```sh
$ bin/mermaid --compile examples/hello-world.maid > hw.js
$ iojs -e "global.Mermaid = require('./runtime/core'); require('./hw.js')"
Hello, world
```

## More

 -  Feel free to ask [@robotlolita](https://twitter.com/robotlolita) anything
    related to this project on Twitter.

 -  Things will eventually be added to the Wiki, but also blogged about on
    http://robotlolita.me/



