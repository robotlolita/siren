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
its state and the set of operations that can be performed in it. These entities
will be called "Subjects".

Each subject in Siren is a tuple of `(Metadata, Operations)`. `Metadata` is a
table mapping keys to values, and represents information that's meant for users
browsing the environment (it contains things like documentation, original
source code, categories, etc.). `Operations` is a table mapping an unique `Id`
to a method (some executable code).

Unlike object-oriented languages, users don't interact *directly* with
subjects. Instead, they send messages to a context, and the context decides
which operation should be executed. In this sense, Siren is considered a
context-based programming language.

```ruby
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


## Messages and Syntax

Siren's syntax for messages is similar to Smalltalk's:

  - `SUBJECT message` is an unary message, so it only has one argument (the
    subject). Unary messages may be any valid identifier, except reserved words.

  - `SUBJECT + OTHER-SUBJECT` is a binary message, so it has two subjects as
    arguments. Binary messages may be any valid sequence of **symbols**.

  - `SUBJECT keyword: OTHER-SUBJECT other-keyword: MORE-SUBJECTS` is a keyword
    message. Keyword messages take at least two arguments. Keywords may be any
    valid identifier.

All messages are left associative, and the only precedence assigned in Siren is
`Unary > Binary > Keyword`. In practice the following code:

```ruby
10 between: 1 successor + 2 and?: 10 predecessor
```

Is equivalent to the following code:

```ruby
(10) between: (((1) successor) + (2)) and?: ((10) predecessor)
```

In addition to this, one may use the special syntax `;` (chain) to reduce the number of
parenthesis when chaining operations:

```ruby
[1. 2. 3] map: _ as-text;
          join: ", ".

# Is equivalent to
([1. 2. 3] map: _ as-text) join: ", ".
```

## `do` notation

(TBD)


## Subjects

A subject is introduced by defining its set of known operations:

```ruby
# Note that expressions are separated by `.` in Siren, and `.` may
# optionally be added after the last expression as well.
let Ligeia = {
  # note that `self` is an arbitrary, and regular parameter name here
  def self name  = "Ligeia".
  def self hello = self name, " says 'Hello'.".
}.

Ligeia hello. # => "Ligeia says 'Hello'."
```

Subjects come with a set of default operations from the `Object` subject, by
default, but one may decide to start with a different set of default
operations. To support this, one may use the `refined-by:` operation:

```ruby
let Says-Hello = {
  def self hello = self name, " says 'Hello'.".
}.

let Ligeia = Says-Hello refined-by: {
  def self name = "Ligeia".
}

let Leucosia = Says-Hello refined-by: {
  def self name = "Leucosia".
}.

Ligeia hello.   # => "Ligeia says 'Hello'."
Leucosia hello. # => "Leucosia says 'Hello'."
```

The syntax `Subject { ... }` is sugar for `Subject refined-by: { ... }`.


## Inheritance vs. Composition

(TBD)


## Safe extensions and Contexts

As previously mentioned, Siren messages are sent to contexts, which then get to
define the operation to be executed. Siren has a Global context, where mappings
from new subjects are automatically added to, and Lexical contexts, which may
provide additional mappings.

Contexts are first-class values, and are the result of extending a subject:

```ruby
let Context-A = Context.

let Base = {
  def self name = "Ligeia".
}.

let Upper-Case-Context = Base extended-by: {
  # this uses Context-A
  def self name = self name as-upper-case.
}.

let Lower-Case-Context = Base extended-by: {
  # this uses Context-A
  def self name = self name as-lower-case.
}.

# this uses Context-A
Base name. # => "Ligeia"

use Upper-Case-Context in {
  Base name. # => "LIGEIA".
}.

use Lower-Case-Context in {
  Base name. # => "ligeia".
}.

# You can combine contexts with the `,` operator.
# In this case, the contexts conflict in the `name` operation, and as
# such a composition of them is not possible. This will eventually
# require people to solve the conflict using one of the symmetric
# composition operator in Traits (tbd).
use Upper-Case-Context, Lower-Case-Context in {
  Base name. # (right now, this results in a last-one-wins behaviour) "ligeia"
}.
```


## Methods, Blocks, and Returns

Siren's methods are internal to a subject, and can not be taken out of it
(bar mirror reflection, if available). This means methods can't generally be
passed around by themselves.

To address this, Siren provides "blocks". Blocks are similar to first-class
functions, and behave very much like one when they're constructed outside of a
method:

```ruby
let double = { value | value * 2 }.

double call: 2. # => 4
```

When they are constructed inside methods, however, "blocks" have an additional
feature called *non-local return*. This allows blocks that are passed as
arguments to other operations to return a value from the method they were
constructed in. In essence, this allows the following:

```ruby
let Guess = {
  def self number: n
    (n === 4) then: {
      ^ "You've guessed correctly!".
    }.
    "Better luck next time."
}.

Guess number: 1. # => "Better luck next time."
Guess number: 4. # => "You've guessed correctly!"
```

Note that the block that computes `"You've guessed correctly!"` is a
first-class subject that is sent to another method (`then:`) to be evaluated,
and the method `number:` itself does nothing with its return value. But because
it has the special return operator (`^`), when it's executed that value is
returned as if the method `number:` itself had returned it. In this sense,
blocks are much closer to a hybrid between first-class functions, and C-style
blocks.

> **What happens if you call a block with non-local return after the method
> that created it has returned?**. It's a runtime error.


## Numeric system

Currently Siren has arbitrary precision integers, and 64-bit floating point numbers.

A redesign of the numeric system will move Siren closer to Scheme's numeric tower:

  - Arbitrary precision integers will be the default for integer constants;

  - Arbitrary precision decimals will be the default for decimal constants;

  - Rationals will be the default for fractional constants (not supported yet);

  - Numeric operations will choose the most appropriate number type in the
    result, between the above three types. Additionally, there'll be a context
    for operations without automatic conversions; 

  - Limited numbers (Byte, (Unsigned-)Integer-16bits, (Unsigned-)Integer-32bits,
    (Unsigned-)Integer-64bits, Float-32bits, Float-64bits) will be provided as
    additional entities, which one may convert the initial constants to, with
    some precision loss. Operations on these will never convert automatically
    between types. 


## Text handling

Like in Swift, text subjects in Siren are entirely opaque. Unlike Swift, text
subjects in Siren are also immutable. Operations on text always return a new
text, and it's not possible to look at the contents without getting a
particular view for the text. Currently, only a `Characters` view is
implemented, which allows one to look at the contents of a text as a list of
character clusters (this is currently broken, btw).

Siren differentiates between `"Text with escape sequences"` and `"""Raw
text"""`, in the literals, but they both result in the same `Text` subject, and
both support multi-line text literals.


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
- Range (`1 to: 10`, inclusive range subjects).

Furthermore, iterable operations on collections returns lazy versions of them,
so we have: Lazy-List, Lazy-Vector, Lazy-Set, Lazy-Sorted-Set, Lazy-Map,
Lazy-Sorted-Map.


## Controlled mutability

All values in Siren are immutable by default, but Siren offers a `Reference`
subject, which has `value` and `set!:` operations. Reference works sort-of like
an L-value in languages that have mutable assignment.

```ruby
let mutable = Reference new: Unit.  # `Unit` is the subject representing "no value"
mutable set!: 1.
mutable value. # => 1
mutable set!: 2.
mutable value. # => 2
```


## Error handling

So far Siren only supports crashing the process by raising an exception, or returning predictable failures as a `Result` type (same as `Result` in Rust, or `Either` in Haskell);

```ruby
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

Better approaches to error handling remain an open issue here. Ideally I'd like
to implement a conditions system (see Common Lisp and Dylan);


## Alien-based FFI

Siren does not have special syntactical support for FFI, instead the entire FFI
layer is implemented in user land, using the concept of
[Aliens](http://gbracha.blogspot.com.br/2008/12/unidentified-foreign-objects-ufos.html).

Aliens consist basically of two things:

  - A proxies subject over "alien" (external) operations.

  - A way of converting between internal (Siren) subjects — `expatriate:` —, and
    external (Alien) subjects — `alienate:`.
  
This approach allows one to maintain security guarantees (like
Object-Capability Security), while both not tying your language to a specific
FFI mechanism, and giving people the same semantics of the language they're
working on when interacting with external objects. One can always switch the
FFI implementation if they're interested in different guarantees (safety vs
performance, for example).

In Siren, these proxies are created automatically when bringing JavaScript's
objects into Siren's world. For example, if I wanted to use the
[shoutout](https://github.com/robotlolita/shoutout) library for events, I'd do
this:

```ruby
# Siren code                                # JS Code
# ----------------------------------------- # ------------------------------------------
let Signal = Module import js: "shoutout".  # require('shoutout')
let clicked = Signal apply: [].             # Signal()

clicked add: { x y | Console log: [x. y] }. # clicked.add((x, y) => console.log(x, y))
clicked apply: [10. 10].                    # clicked(10, 10)
# => "[10. 10]"
```

Even though this code invokes JS operations passing as argument Siren subjects,
and even though the JS code returns JS objects, it works just fine, because the
Alien layer converts these objects to the expected representation on both
sides.

See the
[Alien implementation](https://github.com/siren-lang/siren/blob/master/runtime/src/JS.siren)
for more details on how this works.


## Metadata

All objects in Siren can carry meta-data around, and this meta-data is used to
support the interactive programming part of Siren. This is fully implemented in
the
[Reflection](https://github.com/siren-lang/siren/blob/master/runtime/src/Reflection.siren)
module. This meta-data is an important part of Siren's debugger and browser modules:

```ruby
> browse object: Object; messages
# Messages in Object
# ------------------
# 
# (Uncategorised):
#   • self =/=> that
#   • self ==> that
#   • self => value
#   • self expatriate-to-JS
# 
# Dynamic operations:
#   • self perform: message context: context
#      | Allows performing a message by its name, which can be computed     dyn...
# 
# Extending:
#   • self extended-by: object
#      | Extends the object with new messages as provided by the given [[object...
#   • self extended-by: object context: context
#      | Extends the object with new messages, as provided by the given     [[o...
# 
# Handling errors:
#   • self does-not-understand: message
#      | Allows defining how to handle errors resulting from sending messages...
# 
# Inspecting:
#   • self describe
#      | A textual representation for the object
# 
# Refining:
#   • self refined-by: object
#      | Constructs a new object based on the given object
#   • self refined-by: object context: context
#      | Constructs a new object `O'` based on this object, such that `O'` is...
# 
# => <Browser for: <Object>>
```


## Encouraged purity

Siren does not force people to write pure applications, but it provides tools
to make it easy to write programs like that where possible. The approach is
very similar to Clojure's:

  - All built-in data structures (bar `Reference`) are immutable, so people
    can't mutate these structures to begin with, which means code dealing
    just with data, and using the built-in structures, will be pure.

  - Side-effecting operations are suffixed with a `!`. Side-effects could be
    partiality (`[] first!` would crash the process with an exception, whereas
    `[] first` is always safe), I/O, mutation, etc.


## Branding and ad-hoc hierarchies

Siren has no identity equality, no universal equality, no classes, and no
types. Because of this, things like hierarchies do not exist in the Siren
language, per se. Everything relies on structural equivalence (or in this case,
"duck typed", if you want to use the term).

There are two problems with this approach:

  - Sometimes one wants to uniquely identify some object. This is not possible
    if you don't have some kind of identity.

  - Sometimes one wants to build hierarchies for testing characteristics that
    can't be encoded just with available operation names.

Brands are Siren's answer to both of these problems. A Brand is a unique value
that has a concept of hierarchy:

```ruby
# Consider these values that have the same structure
let mine  = Brand with-description: "Siren".
let yours = Brand with-description: "Siren".

# When each of them are created, they get assigned an unique identity. And
# this identity allows us to tell them apart:
mine  === mine.  # => True
yours === yours. # => True
mine  === yours. # => False
yours === mine.  # => False
```

Hierarchies are created when a brand is refined and can be tested with the `is:`
operation:

```
let Shape?   = Brand with-description: "Shape".
let Ellipse? = Brand with-description: "Ellipse".
let Circle?  = Ellipse with-description: "Circle".
let Square?  = Brand with-description: "Square".

Square? is: Shape?.   # => True
Square? is: Ellipse?. # => False
Circle? is: Ellipse?. # => True
Circle? is: Shape?.   # => True
```

Besides being able to construct identities and hierarchies in an ad-hoc manner,
brands can be attached to existing subjects, or removed from them, at any
point. This means that a subject may have many identities and hierarchies, at
any given time.

Note that brands can only be removed if one has the canonical brand
object. Brands are not visible from user code, not even with reflection.

```ruby
let square = {
  def self side = 10
  def self area = self side * self side
}.

# The `has` operation respects hierarchies
Square? attach-to: square.
Brand on: square; has: Square?.  # => True
Square? remove-from: square.
Brand on: square; has: Square?.  # => False
```

Because brands are unforgeable and not accessible from user code, they also
serve as capabilities:

```ruby
# Here's a solution to the Circle-Ellipse problem in Siren
let minor-radius = Reference new: 10.
let major-radius = Reference new: 10.
let Circle-Capability = Circle? with-description: "Circle (capability)".

let thing = {
  def self radius
    Brand on: self; has?: Circle-Capability; then: {
      self minor-radius.
    } else: {
      Exception message: "Not a circle!"; raise!
    }

  def self set-radius!: r
    minor-radius set!: r.
    major-radius set!: r.
    Circle-Capability attach-to: self.

  def self minor-radius = minor-radius value.
  def self major-radius = major-radius value.

  def self set-minor-radius!: r
    minor-radius set!: r.
    self minor-radius =/= self major-radius then: {
      Circle-Capability remove-from: self
    }

  def self set-major-radius!: r
    major-radius set!: r
    self minor-radius =/= self major-radius then: {
      Circle-Capability remove-from: self
    }

  def self area = Float-64bits pi * self minor-radius * self major-radius
}

# It starts as a circle. And a circle is also a special form of Ellipse
Brand on: thing; has?: Circle?.  # => True
Brand on: thing; has?: Ellipse?. # => True

# But when we change the value in the subject, its *class/hierarchy/type*
# also changes (this is impossible to do in languages where classifications
# are tied to objects/subjects — like in class hierarchies/instanceof, — or
# to types — like in type systems with subtyping support)
thing set-minor-radius!: 5.

Brand on: thing; has?: Circle?.  # => False
Brand on: thing; has?: Ellipse?. # => True

thing set-radius!: 20.

Brand on: thing; has?: Circle?.  # => True
Brand on: thing; has?: Ellipse?. # => True
```


## First-class parametric modules

(TBD)


## Pattern matching

(TBD)


## Algebraic structures

(TBD)


## Concurrency

(TBD)


## Decorators

(TBD)

