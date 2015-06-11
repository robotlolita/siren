Platform Design
===============

> **Note**: This document is a work in progress.

Mermaid is a programming platform around the idea of live objects, just like
other Smalltalk dialects (Smalltalk, Self, etc.). In this kind of system,
programs are written in terms of interactions between objects, a style of
programming called Object Oriented. But while most of the influence in Mermaid
comes from its close cousin Self, there's also a lot of design decisions that
are informed by functional programming (in languages like ML and Haskell) and by
Lisp dialects. This document describes the approach to design that's used in the
core of Mermaid's platform.


## Overview

Mermaid is a pure object oriented language using prototypes but being limited to
single delegation. Objects can be extended arbitrarily and extensions are
restricted to a lexical (message) region. Messages are stored in objects as
unique values, rather than Strings, which means that collisions are not possible
when extending an object. Names that refer to a message are resolved lexically,
so different lexical regions may have a particular message name (e.g.:
`as-string`) resolve to two different message objects in the same object.

Since one of its goals is to provide an interactive platform, Mermaid is a fully
reflective system, and meta-data can be attached to any object, as well as
queried at any time during the execution of the program. Users need to acquire
the proper Mirror to reflect on the parts of the object they're interested in.

Another major goal in Mermaid is to be used as a programming language for
teaching. Within this goal, the ability of understanding programs through
examples, exploring them and extrapolating from them is essential. This fits
nicely with the prototypical OO model, since the core idea in the model is to
create objects that exemplify a concept (so they're fully usable on their own)
and extrapolate from them.

Furthermore, to make reasoning about programs simpler, and live programming
feasible, most of Mermaid's functions have no side-effects, and the ones that do
are explicitly marked (with a ! suffix in the message name).


## Design Goals

-  **Correctness**: The system should guide people to writing correct programs
   by design. This can be done by modeling the world such that objects can't
   enter invalid states.

-  **Exploration**: The system should support exploratory programming. Users
   should be able to experiment with their programs without the risk of
   unknowingly launching missiles.

-  **Understandability**: The objects should be easy to understand, which tends
   to mean they shouldn't do too much, and they should be aptly named after what
   they do.

-  **Discoverability**: The system should be discoverable, for this objects
   should be tagged with enough meta-information such that the system can
   provide tools for finding them.


## Computations and objects

Mermaid is a pure Object-Oriented language. Users design programs by describing
how objects interact with each other. All actions in the system must be
carried by sending messages to objects (there are no control flow structures
such as `if` statements or `for` loops). While this model of programming can be
fairly powerful, it's not immediately obvious how one should go about designing
these interactions.

In Mermaid, there are guidelines for effectively designing them. A design
process starts by determining the problem, figuring out which components this
problem has, and then determining which kind of concept each component should be
represented as in the Mermaid world.

Kinds of concepts can be divided in:

-  **A Process** is something that, given some data, manipulates it in some
   way. Note that *manipulating* data is not the same as *mutating*
   data. Whether a process mutates things or not is a separate concern from what
   said process does. For example, `sorting` is a process. `Writing a file` is
   another process.

-  **An Algebra** is some kind of entity and a set of processes that manipulate
   this entity in some way. Data structures are naturally algebras, but any
   concept might be captured as an algebra. For example, an ATM may be
   represented as an algebra with operations `deposit` and `withdraw` (again,
   the presence of side-effects in those operations is completely orthogonal to
   this modelling).

-  **An Universe** is the domain in which these concepts are presented. So, for
   example, if you're modelling Trilean logic in Mermaid, then your *universe*
   would be Trilean logic, your *algebras* would be True, False, and Unknown,
   and your *processes* would be And, Or, Invert, and Implies.

In Mermaid, *processes* tend to map to messages or blocks, *algebras* map to
objects, and *universes* map to objects, modules or packages[¹](#fn1). There are
cases where that might differ, and, for example, an *object* might end up
representing a *process* (state machines and actors are good examples of this).


## Designing algebras

Once you've figured out the concepts in your *universe*, you can start splitting
them into algebras. First, you need to figure out whether a concept is a single
thing (scalar), one thing in many (sum), or many things (product).

Integers are an example of a *scalar* concept. They're a single entity which
makes sense on its own, and can not be broken into further entities[²](#fn2) in
Mermaid. Even if an Integer was made up of different objects, those objects are
not visible to the user, and the user can not extract those components, or
construct an Integer from those components.

Linked lists are an example of a *sum* concept. They're an entity where each
instance of the concept might either be the end of the list, or a node that
contains a value, and a pointer to the rest of the list. Booleans are another
example of a *sum* concept, where an instance may be either *True* or
*False*. While "Linked List" and "Boolean" are *sum* concepts, each **instance**
of those concepts will have its own classification. Still following the example,
`end of the list`, `True` and `False` would be a scalar, whereas `a node
containing a value and a pointer to the rest of the list` would be a product.

Arrays are an example of a *product* concept. They're an entity where each
instance contains many different concepts. Records (e.g.: An entity containing a
person's age and their name) are another example of a *product*.


## Making illegal states un-representable

If you're not familiar with the concept of *sum types* (which is not surprising,
given that most programming languages, including Mermaid, only offer product
types), you might be asking yourself why one would need them.

Sum types help with modelling **possibilities** (Which possible states this
entity can be into? Which states can this entity transition to?) naturally, and
this helps with correctness because if you capture the possibilities correctly
as sum types, it's not possible for your program to enter an illegal state,
because illegal states do not exist in your world to begin with.

Consider the previous example of Linked Lists. If one were to design a Linked
List without the use of sum types, it would look like this:

```ruby
let Node = {
  def as-string
    (this empty?) then: {
      "(Nil)"
    } else: {
      this value as-string + ", " + this next as-string
    }

  def empty?
    False
};

let a = Node { def empty? = True };
let b = Node { def value = 1;; def next = b };
b as-string
(* => 1, (Nil) *)
```

This object expects two pieces of state: `value` and `empty?`. If `empty?`
evaluates to `True`, then `value` is not expected to be present. Otherwise,
`value` is expected to be present. In the example usage, the nodes are correctly
constructed, so sending `as-string` to the `b` object works. But consider the
following:

```ruby
let c = Node { def value = 1;; def next = Node };
c as-string
```

This fails because `Node` has `empty?` evaluating to `False`, but does not have
a `value` message. Furthermore, the definition of `as-string` is complicated
because it needs to deal with these conflicts of possibilities, and extending
this object to support additional states would only complicate matters
further. The recommended approach is to, instead, factor these possibilities
into distinct objects with the relevant messages in them.

> **Note**: Mermaid does not support sum types for now, one must encode them by
> using dynamic dispatch with product types. It's not clear if there's a way of
> Mermaid to naturally support sum types without introspecting objects and
> complecting messages, or if it would be an advantage to do so. This remains an
> open problem.

```ruby
let Linked-List = {
  (* Ways of constructing values of this universe *)
  def empty
    this traits Empty

  def of: value
    this empty, value

  (* Shared behaviour in this universe *)
  def traits {
    def Empty = Empty
    def Node = Node
  }
};

let Empty = Linked-List {
  def as-string
    "(Nil)"

  def , value
    this traits Node {
      def value = value
      def next  = this
    }
};

let Node = Linked-List {
  def , value
    this traits Node {
      def value = value
      def next  = this
    }

  def as-string
    this value as-string + ", " + this next as-string
};

let a = Linked-List empty;
let b = a, 1;
b as-string
```

In the revised example not only is it impossible to create a Linked-List in an
illegal state, since you need to start from one of the available constructors in
the `Linked-List` object (assuming `Empty` and `Node` are not exposed globally),
and all the possible transitions to other states are constrained to be correct
by their relative traits, the whole solution is more extensible. One could
clone `Linked-List` and define different behaviours for `Empty` and `Node` if
necessary.


## Interlude: A Review of Mermaid's Object Model

Mermaid is a pure object oriented language, which largely means that the
entities available to model the world in Mermaid are objects. In Mermaid,
everything is an object, and all of the operations work on objects. This gives
Mermaid a sufficiently expressive computational and compositional power —
the result of composing an object is another object, which can be further
composed with existing operations into further objects.

An object is an entity together with the set of operations it supports. In
Mermaid all objects carry all of the operations that they support. The only
way of "using" (or rather, interacting with) an object is to send that object a
message. The object might then choose whether to perform the operation (if it
can understand it) or not.

This is fairly similar to the way people interact with a computer using the
keyboard, for example. Pressing one key means sending a message to the computer,
which then might get interpreted as a character and displayed on the screen, or
might cause a menu choice to be made (in case there is a shortcut defined for
that key). The message is how the user specifies which operation they want to
carry out, and the operation is how the target decides to interpret that
message.

In mermaid operations are a collection of Mermaid statements, which are executed
in order if the operation is to be carried out. Messages are unique identifiers
given to these operations. A message name is a way for someone to refer to these
operations. Unlike most existing Object Oriented languages, messages and message
names are separate concepts. A message is guaranteed to be globally unique,
which means there can never be a collision between two messages in Mermaid. A
name, on the other hand, is a way of resolving these messages. Names in Mermaid
are lexical and defined by the call-site.

For example, in:

```ruby
let unit = {
  def as-string
    "<unit>"

  def + that
    that

  def foo: x bar: y
    this
}
```

`as-string`, `+` and `foo:bar:` are message names. A unique identifier for those
messages is created behind the scenes, and the names are added to the global
mapping of `Name → Message`, so people can send messages to the `unit` object.

Sending a message to this object might look like this:

```ruby
unit as-string;
unit + 1;
unit foo: 1 bar: 2
```

When Mermaid executes these operations, it figures out which message `as-string`
means for the `unit` object in the current scope, then sends that message to the
`unit` object. The `unit` object then takes over the process and figures out
which operation that message means, finally it returns `"<unit>"` as the result
of carrying out the operation defined by that message.

A user might override the mapping of names to messages by using the `use`
expression in the language:

```ruby
let my-unit-as-string = extend unit with {
  def as-string "<my-unit>"
};

use my-unit-as-string in {
  unit as-string;   (* => "<my-unit>" *)
};

unit as-string  (* => "<unit>" *)
```


## Translating Algebras into Mermaid

At this point you should have a set of `(Entity × Processes) ∈ Universe` that
feels consistent. What's left is representing this using Mermaid's concepts. As
a pure object-oriented language, most of these concepts will map to
objects. This might sound unnatural, but having a single concept means we have a
much greater compositional power.

While we've got many concepts mapping to a single concept, objects can be broken
down into several different categories depending on what they're used for. The
major categories in Mermaid are **Traits**, **Examples** and **Refinements**.


-  A **Trait** is an object that provides a (possibly incomplete) set of
   features to some entity. Traits are not usable on their own, they must be
   added to an object that provides the operations it expects.

-  An **Example** is a fully working object. While Examples can be used on their
   own, they are not meant to, rather they're provided so people can experiment
   with them and build on top of them. These are called "prototypes" in OO
   literature.

-  A **Refinement** is an example that has been further refined into doing
   whatever the user needs it to do (e.g.: by providing the object with their
   data, such that it computes things that are useful to the user). OO
   literature does not distinguish between "example" and "refinement".

There are a few courses of action when translating algebras to objects,
depending on the algebra. But in the common case:

-  Common operations are stored in a **trait** object.

-  One or more **examples** of the algebra are provided as starting points to
   the user, by refining the **trait** object. Examples are expected to be fully
   working, even if they don't do anything useful.

-  An entry point object might be exposed to the user which controls how the
   examples / traits are initially refined. This helps with avoiding the
   possibility of illegal states.

-  If it doesn't make sense for an object to be refined, and it provides all of
   the parts it needs to work, then it's not necessary to separate it into a
   *traits* object and an *example* object. Self calls these objects "Oddballs,"
   Mermaid calls them "Singletons".



## Footnotes

- <a name="fn1">¹</a>: So far there are no concepts of packages in Mermaid, I do
  not know if we'll ever have them either.

- <a name="fn2">²</a>: This is not entirely true, as you can break integers into
  bytes, and further into bits. But this underlying representation is opaque in
  Mermaid so the user can't see it.


## References

- [Organizing Programs Without Classes](http://bibliography.selflanguage.org/organizing-programs.html)

- [Mirrors: Design Principles for Meta-Level Facilities of Object-Oriented Programming Languages](http://bracha.org/mirrors.pdf)

- [Why Functional Programming Matters](http://www.cse.chalmers.se/~rjmh/Papers/whyfp.html)

- [Traits: Composable Units of Behaviour](http://scg.unibe.ch/research/traits)

- [Domain Specific Languages](http://haskell.cs.yale.edu/?post_type=publication&p=126)

- [On Understanding Data Abstraction, Revisited](http://www.cs.utexas.edu/~wcook/Drafts/2009/essay.pdf)

- [Feature Oriented Programming with Object Algebras](http://www.cs.utexas.edu/~wcook/Drafts/2012/FOPwOA.pdf)

- [Designing with types: Making illegal states unrepresentable](http://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/)
