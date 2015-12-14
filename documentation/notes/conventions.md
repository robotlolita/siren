# Conventions

A few guidelines for writing Siren code.


## Naming

Siren uses `lisp-case` for identifiers. Identifiers must start with a
letter, but may contain any (non-reserved) number or symbol after that.

Conversion messages should be named `as-<type>`, so `as-integer` would
convert the object to an integer, `as-tuple` would convert the object to
a tuple, etc.

Predicates (tests which return a boolean) should be suffixed with a
`?`. So you'd write `finite?` instead of `is-finite` for a message that
tests if a number is finite.

Observable effects that affect the behaviour of the program should be
suffixed with a `!`. So a method that writes a file to the file system
would be `write!:`.


## Organisation

Siren is mostly organised into objects and traits. Objects are anything
in the system that is *readily usable*. Traits are things that have a
set of common behaviours but lack something to be usable on its own.

Ideally, the interface you expose is in a correct state, and any message
send to it results in a new object in the correct state. Exposing traits
directly violates that (see the Builder pattern, avoid it).

A trait is usually stored in a `traits` message in the object.

```ruby
module exposing
 { def_ Point = Point }
where

# Not usable on its own
let Point-Trait = {
  def self x: x y: y
    self {
      def_ x = x.
      def_ y = y.
    }

  def self + point
    self x: self x + point x
         y: self y + point y.
}.

# Usable on its own
let Point = Point-Trait {
  def_ traits {
    def_ Point-Trait = Point-Trait.
  }
  
  def_ x = 0.
  def_ y = 0.
}
```


## Observable vs Benign effects

Effects are usually problematic *when* they change the behaviour of a
program. But not all effects do that. In Siren, such benign effects are
accommodated, and they don't get a `!` suffixed to their names.

Examples of benign effects are changing meta-data, lazy pure
computations, and outputting debugging information.
