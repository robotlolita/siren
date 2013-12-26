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
pure object oriented programming. Semantics are inspired by Scheme, Self, ML,
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
      (size = 0) then: [ result ]
                 else: [ take' size: size - 1
                               from: xs rest
                               into: xs first ~ result. ]
  end.
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
force: promise => (promise forced) then: [ promise value ]
                                   else: [ begin
                                             promise !! forced := True.
                                             promise !! value  := promise value apply.
                                             promise !! value.
                                           end. ]
```

For providing functionality, Mermaid uses first-class parametrised modules.

```smalltalk
| Root |

main: arguments => Root IO show: "Hello, " ++ arguments first.
```

## 2) Concepts

### 2.2) Objects

Objects in Mermaid are first-class entities of dynamically dispatched behaviour, and
behaviour can be shared by objects by way of delegation. In other words, an object is
something that responds to particular messages with an expression. There's nothing
about an object besides messages that maps to expressions.

A message can be of one of three types:

 *  An unary message, e.g.: `x first`, `x last`, `x is-empty?`, is a computation that only
    depends in the data stored in the object that is receiving the message.

 *  A binary message, e.g.: `x + y`, `x ~ y`, `x > y`, is a computation that depends on the data
    stored in the object receiving the message, and a single other object.

 *  A keyword message, e.g.: `x from: y to: z`, is a computation that depends on the data
    stored in the object receiving the message, and K other objects (where K > 0).
  
Since all of the data in an object is a message, the evaluation of such data is delayed
until the object receives such message, and there is no difference between data and
computations.


### 2.1) Expressions

Expressions in Mermaid are made of objects and message passing. Expressions are similar to
mathematical expressions, except when mutable values and side-effects are involved
in the computation — since Mermaid does not try to be a pure language, only to avoid
mutability and side-effects as much as possible.

At any rate, the concepts in the language make it possible to easily teach how to reason
about programs in terms of reductions and equivalence.


### 2.3) Evaluation order

Mermaid is an eager language with applicative-order and call-by-sharing semantics, therefore
all of the expressions in a message are evaluated before the message is sent to the receiver
object. Once the messages are evaluated, the value is passed over to the message as a shared
reference — although due to immutability there is no perceived difference between this
semantics and call-by-value.


### 2.4) Bindings and lexical scoping

The language uses lexical scoping, with similar semantics to JavaScript with respect to
clsoures and so on. However, bindings can only be introduced by `where`, and `let` expressions,
and message parameters. There are no variables in the language.

```smalltalk
take: n => n.    ;; n is introduced as a binding inside the message body.

take: n => n + y
           where
             y => n * n.            ;; y is introduced as a binding inside the message body.
           end.
             
take: n => let
             y => n * n
           in
             n + y.                 ;; y is introduced as a binding inside the message body.
           end.
```

### 2.5) Delegation

Mermaid uses delegative inheritance with prototypes. Each object has a single delegation
slot that points to another object. The chain always ends up in the `Root` object. Mermaid
has no `Null` values.


### 2.6) Blocks and closures

Functions in Mermaid are just objects matching the conventional interface for functions:

```smalltalk
Function0 => { apply => ... }
Function1 => { apply: a => ... }
Function2 => { apply: a with: b => ... }
Function3 => { apply: a with: b with: c => ... }
```

All methods are closures, and capture the the environment and the object in which they
are defined. Unlike JavaScript, `this` is always bound in Mermaid.


### 2.7) Control-flow

Control-flow is implemented in the language itself, through primitives and thunks/functions.
The common form is the `then:else:` message in the `Boolean` prototype, which takes two thunks
and applies the first one if the object is true, or the second one if the object is false.

Custom control-flow mechanisms can be derived in the same fashion, by using objects, messages
and thunks. Due to the preference of recursion for simpler semantics and teaching, there are
no loops in the language, nor are there non-local returns (which don't have much of a direct
mapping to JavaScript, short of using exceptions as a control-flow, which slows everything
down). Loops can be derived in terms of recursion, none the less, if such construct is needed.


### 2.8) Concurrency

Concurrency is implemented in terms of asynchronous computations and futures, which map
directly to the usual idioms in JavaScript (except for futures being more sane than Promises/A+).

```smalltalk
concatenate: path1 with: path2 => do
                                    file1 <- (File: path1) read.
                                    file2 <- (File: path2) read.
                                    yield file1 ++ file2.
                                  end.
                                  
;; Or alternatively:

(File: path1) read >>= [| file1 |
                        (File: path2) read map: [| file2 | file1 ++ file2 ]]
```

### 2.9) Exceptions

Mermaid uses exception for exceptional conditions that can not be handled by the current
computation, and are unlikely to be possible to be handled by most of the callers. Regular
failures are best modelled as monads.

The way exceptions work is very similar to ML:

```smalltalk
division-by-zero => Error { message => "Division by zero." }.

divide: x by: y => (y = 0) then: [ raise division-by-zero ]
                           else: [ x / y ].
                           
main: _ => divide: 1 by: 0
           rescue
             division-by-zero: e => IO show: "Can't divide by zero"
             Error: e => raise e.
           end.
```

### 2.10) Modules

Modules are first-class parametrised objects. A module is defined by its bindings, and
the messages it responds to (just like an object). And can only be loaded by the `ModuleLoader`
object, present in the `Lobby` object. If you don't pass the `ModuleLoader` to a module, it
can never load any other code, only work with whatever you pass over to it.

```smalltalk
| Lobby |

Prelude => Lobby module load: "./foo.maid" with: [ Arg1, Arg2 ].
```

### 2.11) Primitives




## 3) Program structure
## 4) Standard library
## 5) Formal syntax
