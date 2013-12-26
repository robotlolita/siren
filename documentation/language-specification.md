The Mermaid Language
====================

The Mermaid language is a compile-to-JavaScript language crafted for teaching
the concepts of programming and programming languages to newcomers using the
WebPlatform. The language semantics are somewhat closer to JavaScript's, but
without the historical accidents that cause lots of confusion for newcomers
when they turn on to JavaScript to learn programming. It should be straight-forward
to introduce the differences and edge-cases in the JavaScript language after
introducing the semantics themselves in Mermaid, however.

The language provides the following semantics:


 *  Lexical scoping (bindings are introduced by `where` or function parameters);
 *  Immutability with reference values (for introducing controlled mutability);
 *  Late binding;
 *  First-class and parametrised modules;
 *  Prototypical object-orientation with single delegation;
 *  First-class functions, with closures;
 *  Untyped, but with strong run-time checking (and user-friendly error messages);
 *  Eager, applicative-order, run-to-completion;
 *  Built-in Monad support (for sequencing actions, not for achieving purity);
 
Besides the language takes uses a Smalltalk inspired syntax, which is as simple
as Lisps', but in my humble opinion, easier to use without a good text editor,
like DrRacket, or Emacs with Paredit. While it is the long-term goal to provide
a good live-programming environment as a mixture of DrRacket with Smalltalk VMs,
I do not think there will be enough time for working on that for now.


## 1) Overview

Mermaid is a eagerly evaluated language allowing functional programming and
object oriented programming. Semantics are inspired by Scheme, Self, ML,
and JavaScript, whereas the syntax is a simplified form of Smalltalk, and
similar to [Purr](https://github.com/robotlolita/purr).

```smalltalk
"Hello" reverse ++ ", " ++ "World!" reverse.
```

Binding introductions in the lexical scope are done through a `where` form,
similar to Haskell's, and method arguments. Functions are provided as objects
matching a conventional interface, and methods can have any arity, but can
not be variadic.

```smalltalk
take: size => 
  take' size: size from: this into: []
  where
    take' size: size from: xs into: result =>
      (size = 0) then: result
                 else: take' size: size - 1
                             from: xs rest
                             into: xs first ~ result.
```

For making things easier to teach, the language provides primitives and syntax
that maps directly to the underlying concepts (unlike JavaScript's constructors,
for example). This way, it is not necessary to care about edge-cases while
teaching the concepts. The standard library is also designed for consistency,
and strong run-time checking, thus exceptions are thrown for inconsistent types
used in non-polymorphic functions, rather than performing automatic type coercions.

Tail calls are optimised for teaching concepts of recursion, but one can still
hit stack overflows for non-tail recursive invocations, for providing reasonable
performance when compiling to JavaScript — since one of the use cases for this
language for me will be teaching about programming in the web platform by developing
games with Functional Reactive Programming and highly-interactive applications.

All data structures provided are immutable, and controlled mutability is provided
in terms of `Reference` types. This is similar to ML and Clojure's approach. While
purity and referential transparency are amazing for reasoning (and this is why Mermaid
makes them the default), for a teaching language in an impure platform, you'll want
to introduce the concepts of mutability at some point, and reference types make
this easy.

```smalltalk
delay: thunk => Reference { forced => False. value => thunk }.
force: promise => (promise forced) then: promise value
                                   else: begin
                                           promise forced := True.
                                           promise value  := promise value apply.
                                           promise value
                                         end.
```

For providing functionality, Mermaid uses first-class parametrised modules.

```smalltalk
| Root |

main: arguments => Root IO show: "Hello, " ++ arguments first.
```

## 2) Concepts
## 3) Program structure
## 4) Standard library
## 5) Formal syntax
