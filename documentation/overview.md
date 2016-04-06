A Quick Overview of Siren
=========================

Siren:

- Is a context-based programming language;
- Has a Smalltalk-inspired syntax;
- Could be [considered object-oriented, but I have reservations on that](notes/faq.md);
- Has immutability by default (in the same sense as Clojure's);
- Has first-class parametric modules;
- Is designed for interactive programming in the REPL;
- Has mirror-based reflection (only to support interactive programming);
- Allows safe and controlled lexical extensions of operations;
- Reifies most concepts to user land;
- Does not have inheritance, but allows something closer to Traits or Extensible Records;
- Does not have identity, nor universal equality;
- Does not have a global namespace (*not implemented yet*);
- Has an extensive standard library (*not implemented yet*).


Influences:

  - [Smalltalk](https://en.wikipedia.org/wiki/Smalltalk)
    (Everything is an object, Message-passing, Non-local returns);
  - [Self](http://www.selflanguage.org/)
    (Prototype-based OO, Mirror-based reflection);
  - [Newspeak](http://www.newspeaklanguage.org/)
    (First-class parametric modules, Aliens, Pattern matching (*not implemented yet*));
  - [Clojure](https://clojure.org/)
    (Immutability by default, Annotating objects with metadata, encouraged-but-not-enforced purity, Ad-hoc hierarchies, CSP (*not implemented yet*));
  - [C#'s Extension Methods](https://msdn.microsoft.com/en-us/library/bb383977.aspx?f=255&MSPPError=-2147217396),
    [Us](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.56.7535),
    [Korz](http://dl.acm.org/citation.cfm?id=2661147),
    [Piumarta's Cola](http://piumarta.com/software/cola/)
    (Contexts);
  - [Haskell](https://www.haskell.org/)
    (Algebraic structures, `do` notation);
  - [Lisp](http://www-formal.stanford.edu/jmc/recursive/recursive.html),
    [Scheme](http://www.scheme-reports.org/),
    [IPython](https://ipython.org/)
    (Interactive programming);
  - [Swift](https://developer.apple.com/swift/)
    ([Text handling](https://developer.apple.com/library/ios/documentation/Swift/Conceptual/Swift_Programming_Language/StringsAndCharacters.html));
  - [Racket](https://racket-lang.org/)
    ([Contracts](https://docs.racket-lang.org/reference/contracts.html) (*not implemented yet*));
  - [E](http://www.erights.org/)
    ([Capability Security](http://erights.org/elib/capability/ode/ode-capabilities.html));
  - [AliceML](https://www.ps.uni-saarland.de/alice/),
    [Scala](http://www.scala-lang.org/)[(z)](http://timperrett.com/2014/07/20/scalaz-task-the-missing-documentation/),
    [C#'s comonadic Tasks](http://dl.acm.org/citation.cfm?id=2367181)
    (Task and Future-based asynchronous concurrency);
  - [C#](https://en.wikipedia.org/wiki/C_Sharp_(programming_language))
    ([Observables](http://reactivex.io/));
  - [Rust](https://www.rust-lang.org/)
    ([Result types](https://doc.rust-lang.org/std/result/));
  - [F#](http://fsharp.org/)
    (`|>` operator, written as `;` in Siren);
  - [Python](https://www.python.org/)
    ([Decorators](https://www.python.org/dev/peps/pep-0318/)).

Possibly others, though they don't map to specific features.


## Computational Model

Siren is a language where all entities you interact with are first-class values
that may be interacted with in a certain way. In this view, these entities are
very similar to objects in object-oriented languages; each entity carries both
its state and the set of operations that can be performed in it.

Each entity in Siren is a tuple of `(Metadata, Operations)`. `Metadata` is a
table mapping keys to values, and represents information that's meant for users
browsing the environment (it contains things like documentation, original
source code, categories, etc.). `Operations` is a table mapping an unique `Id`
to a method (some executable code).

Unlike object-oriented languages, users don't interact *directly* with these
entities. Instead, they send messages to a context, and the context decides
which operation should be executed. In this sense, Siren is considered a
context-based programming language.

```rb
# In common OO languages, this sends the message +(2) to the object 1
1 + 2  ==> 1.+(2)

# In Siren, this sends the message +(1, 2) to the current lexical context
# (Context is an implicit reference to the current context)
1 + 2  ==> Context(+, 1, 2)
```

Like in Smalltalk, all operations are carried by sending messages. Unlike
Smalltalk, the receiver of these messages is a local Context, rather than a
particular object. This means that code like `1 + 2` may execute entirely
different operations depending on the current lexical context.





## Numeric system

Currently Siren has arbitrary precision integers, and 64-bit floating point numbers.

A redesign of the numeric system will move Siren closer to Scheme's numeric tower:

- Arbitrary precision integers will be the default for integer constants;
- Arbitrary precision decimals will be the default for decimal constants;
- Rationals will be the default for fractional constants (not supported yet);
- Numeric operations will choose the most appropriate number type in the result, between the above three types. Additionally, there'll be a context for operations without automatic conversions;
- Limited numbers (Byte, (Unsigned-)Integer-16, (Unsigned-)Integer-32, (Unsigned-)Integer-64, Float-32, Float-64) will be provided as additional entities, which one may convert the initial constants to, with some precision loss. Operations on these will never convert automatically between types.


## Text handling

Like in Swift, text objects in Siren are entirely opaque. Unlike Swift, text objects in Siren are also immutable. Operations on text always return a new text, and it's not possible to look at the contents without getting a particular view for the text. Currently, only a `Characters` view is implemented, which allows one to look at the contents of a text as a list of character clusters (this is currently broken, btw).


## Collections

Siren will offer the following collection types:

- Association (`key => value` or `Association key: k value: v`);
- Tuple (`[1. 2. 3.]`);
- List (cons-based lists, *not implemented yet*);
- Vector (RRB-tree based immutable vectors, *not implemented yet*);
- Set (immutable set, *not implemented yet*);
- Sorted-Set (set with a custom sorting function, *not implemented yet*);
- Map (immutable map, *not implemented yet*);
- Sorted-Map (map with a custom sorting function, *not implemented yet*);
- Stream (Rx-like Observables, *not implemented yet*);
- Range (`1 to: 10`, inclusive range objects).

Furthermore, iterable operations on collections returns lazy versions of them, so we have: Lazy-List, Lazy-Vector, Lazy-Set, Lazy-Sorted-Set, Lazy-Map, Lazy-Sorted-Map.


## Controlled mutability

All values in Siren are immutable by default, but Siren offers a `Reference` object, which has `value` and `set!:` operations. Reference works sort-of like an L-value in languages that have mutable assignment.

```rb
let mutable = Reference new: Unit.  # `Unit` is the object representing "no value"
mutable set!: 1.
mutable value. # => 1
mutable set!: 2.
mutable value. # => 2
```


## Error handling

So far Siren only supports crashing the process by raising an exception, or returning predictable failures as a `Result` type (same as `Result` in Rust, or `Either` in Haskell);

```rb
let search = { list value |
  list empty? then: {
    Result failure: "Not found."
  } else: {
    list first! === value then: {
      Result ok: value.
    } else: {
      search call: list rest with: value.
    }
  }
}.

(search call: [1. 2. 3] with: 4) match: {
  def_ ok: value       = "4 was found!"
  def_ failure: reason = "4 was not found (", reason, ") :<"
}
```

Better approaches to error handling remain an open issue here. Ideally I'd like to implement a conditions system (see Common Lisp and Dylan);



