FAQ
===

These notes are mostly to keep track of questions that arise too often in the
design of Siren's programming model.


### What is Siren?

Siren is a context-based programming language where computations are expressed
in terms of contextual message passing. It's mostly inspired by Self, Clojure,
and Haskell.


### Is Siren an Object-Oriented language?

There are different definitions of Object-Oriented, I don't feel that Siren fits
any of them, although it's somewhat close to Kay's original vision.

> **[Alan Kay](http://userpage.fu-berlin.de/~ram/pub/pub_jf47ht81Ht/doc_kay_oop_en)**  
> OOP to me means only messaging, local retention and protection and hiding of
> state-process, and extreme late-binding of all things.

Computations in Siren are done through messaging, and most of the things are as
late-bound as they can be—you still get problems with some dependencies due to
strict evaluation semantics in composition. That said, whether Siren has "local
retention and protection and hiding of state-process" is up to discussion. In
Siren, entities do hold the data they operate on, but the concept of "local" is
very different from the one present in Smalltalk.

> **[William Cook](http://wcook.blogspot.com.br/2012/07/proposal-for-simplified-modern.html)**  
> An *object* is a first-class, dynamically dispatched behaviour. A behaviour is
> a collection of named operations that can be invoked by clients where the
> operations may share additional hidden details. *Dynamic dispatch* means that
> different objects can implement the same operation name(s) in different ways,
> so the specific operation to be invoked must come from the object identified
> in the client's request. *First class* means that the objects have the same
> capabilities as other kinds of values, including being passed to operations or
> returned as the result of an operation.
>
> A language or system is *object oriented* if it supports the dynamic creation
> and use of objects. *Support* means that objects are easy to define and
> use. It is possible to encode objects in C or Haskell, but an encoding is not
> support.

Siren has first-class entities with named operations, but those names are
**not** available to the clients to use. Instead, a client must translate a
concrete name (such as `successor`) into an internal operation name through a
`Context` object. Contexts are also first-class, but they're entirely separate
beings from the entities that define the operations.

In essence, this means that the same entity might respond different to the same
concrete name depending on the context:

```ruby
use Context global in {
  1 + 1  # => 2
}.

use Inverted-Addition-Context in {
  1 + 1  # => 0
}
```

> **[Wikipedia](https://en.wikipedia.org/wiki/Object-oriented_programming)**  
> A programming paradigm based on the concept of objects, which are data
> structures that contain data, in the form of fields, often known as
> attributes; and code, in the form of procedures, often known as methods.

Siren only has message passing, so entities don't have a concept of "fields" or
"data". Data is indistinguishable from computation.

Other definitions tend to focus on specific features of particular
object-oriented languages: (subtyping or structural) polymorphism, inheritance,
encapsulation. Siren doesn't have inheritance of encapsulation.

More so, most object-oriented languages have a concept of "identity", where you
can uniquely identify an object even if it has the exact same data as another
object. Siren doesn't have this concept. Entities are immutable, have no
identity, and equality isn't global, so only certain entities will be able to
define structural equality. This means that it's impossible to tell `[1]` apart
from `[1]` in Siren, regardless of how those entities are created.
