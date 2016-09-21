# Modules and Distribution

> **NOTE**  
> This document supersedes the [packaging.md](packaging.md) note in this folder.

Siren is a pure [subject-oriented](../overview.md#computational-model) programming
language, and most programs written in Siren are also pure in the functional programming
sense (i.e.: it has no side-effects), though the language doesn't prevent a host environment
from providing objects capable of side-effects to the programmer.

This document will describe why this is important for the module system in Siren, and
how this module system solves several problems in modularity, and package distribution.


## Siren's computational model and modules

Siren is very similar to Newspeak regarding how it approaches modularity at the
most basic level:

  - Modules are subjects (objects in Newspeak), and all names are late-bound. This
    means that modules are first-class components that can be trivially abstracted
    over, and naturally support mutual recursion. 
    [Mutual recursion](https://gbracha.blogspot.com.br/2009/06/ban-on-imports.html)
    is an essential feature for any module system, and we want to support it without
    any additional effort from the user.

  - There's no global namespace. All modules are parametric and accept a single
    Platform argument. What `Platform` means is entirely defined by the thing
    instantiating the module. Sandboxing and multiple copies of a module are
    all supported by this, as is dependency injection.

Where Siren differs most significantly from [Newspeak's modules](http://bracha.org/newspeak-modules.pdf)
is on how a particular module selects implementations of interfaces it's interested
in. Here we take the same approach described in 
[David Barbour's anonymous modules](https://awelonblue.wordpress.com/2011/10/03/modules-divided-interface-and-implement/),
and require the user to provide constraints on the module selection.

Because David Barbour has also written on [the problems of the Platform approach](https://awelonblue.wordpress.com/2011/09/29/modularity-without-a-name/)
I'm not going to spend much time on that. If you want more details on the problem you can read
David's post.

Here's a list of the things we want for **module selection**, and which the
system described here tries to address:

  - A platform should be able to define different "available module sets"/"available subjects"
    to applications running in it. This is important for sandboxing. Siren aims to have all
    of its tools use programs written in it, and you don't want to give I/O access to a
    package description module.

  - A module should be able to constrain the list of modules one of its dependencies
    can see. This is also important for sandboxing, because top-level application modules
    may have access to dangerous I/O features such as talking to the file system, but
    untrusted third-parties shouldn't have that access.

  - Module resolution should not be static. This is important for dependency injection.
    As mentioned by David, the Platform model requires one to know exactly where modules
    are, so they tie a hierarchy with the implementation, not much different from Node's
    `require` taking a file system path. Instead, we want modules to describe **what** they
    need in order to execute, in terms of features, and we'll give them anything that fulfils
    that and is available to them.

  - Module resolution shouldn't be available to all programs. A package description module
    has no need of loading modules to describe meta-data.

  - Module resolution should be provided by a regular subject, and be available at any time.
    This means we can't really do static analysis on dependencies, but on the other hand this
    means we can have a package description provide a function for running build tasks, and
    module resolution would only be available to *that* function, when/if it's called.

The rest of this document is dedicated to describe how the system in Siren achieves these
goals, and how these goals support the packaging system.


### Modules as functions from Platform to Subject

At the most basic level, Siren modules are a function from a `Platform` subject
to another subject. For example, here's a module that implements a counter:

```rb
:siren/2
module (Platform) exposing Counter where

let Counter = {
  def self value
    # Returns the current value of the counter.
    0.

  def self next
    # Returns a counter for the next number.
    self { def _ value = self value + 1 }.
}.
```

A module starts with a language version identifier (so the compiler can provide
better error messages if it's outdated), it's then immediately followed by a
module header.

Modules always take one argument: `Platform`, but they may name it whatever they
wish. It also must expose one subject. In this case, `Counter` is exposed as a result
of instantiating the module. The rest of the module definition is a sequence of
statements that produce a value that can be exposed. Note that `let` statements
are lazy, so the right-hand size isn't evaluated until it absolutely must, and it's
evaluated at most once.

This is a very simple model, but if Siren doesn't have a global namespace, how does
it translate value literals to subjects?


### Literals without intrinsic objects

We want Siren to have literals because they make subjects easier to use, but we
don't want to tie these literals to a set of immutable intrinsics for a few 
reasons:

  - Intrisics may have many more capabilities than what we want to expose to a
    particular module.

  - Changing intrinsics forces sandboxed modules to talk to the module that has
    instantiated them in order to get anything done. This may or may not be a
    good idea depending on what you're interested in, but it strengthens OCS.

  - We can support extensible literals without requiring compile-time macros
    or grammar extensions.

In the simple case, where a literal is prefixed by a sigil, we use a message
with that name in the current scope to reify the literal:

```rb
let float = {
  def _ reify-integer: ast
    ...
}.

%float 10. # => float reify-integer: <intrinsic integer ast for 10>
%(a longer message) 10. # => (a longer message) reify-integer: ...
```

When a prefix isn't provided, we look for a module that provides a reifier
for this value:

```rb
10.    # => Integer reify-integer: ...
"foo". # => String reify-string: ...
[1].   # => Array reify-array: ...
[:].   # => Dictionary reify-dictionary: ...
{ 1 }. # => Function reify-function: ...
```

Subject literals are not overridable, and are always handled by the compiler/runtime.

The AST representation of the literal is the same for all modules, and made
out of intrinsic subjects, provided by the runtime, and consistent across the
entire program. Describing the AST representation is out of the scope of this
document.


### What's in a Platform subject?

When a prefix isn't provided, we'll look for a *module* that provides a
reifier. But how do we look for modules in the first place? Well, first we
need to describe what the `Platform` subject is.

A `Platform` subject is a subject that provides a series of features for
that 