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

- Smalltalk (Everything is an object, Message-passing, Non-local returns);
- Self (Prototype-based OO, Mirror-based reflection);
- Newspeak (First-class parametric modules, Aliens, Pattern matching (*not implemented yet*));
- Clojure (Immutability by default, Annotating objects with metadata, encouraged-but-not-enforced purity, Ad-hoc hierarchies, CSP (*not implemented yet*));
- C#'s Extension Methods, Us, Korz (Contexts);
- Haskell (Algebraic structures, `do` notation);
- Lisp, Scheme, IPython (Interactive programming);
- Swift (Text handling);
- Racket (Contracts (*not implemented yet*));
- E (Capability Security);
- AliceML, Scala(z), C# (Task and Future-based asynchronous concurrency);
- C# (Observables);
- Rust (Result types);
- F# (`|>` operator, written as `;` in Siren);
- Python (Decorators).

Possibly others, though they don't map to specific features.


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



