# Object Model

Siren was born as a prototype-based language, in the veins of Self, trying to
tackle some of the problems with extensibility and modularity in object models.
The first attempt at this was similar to concepts such as
Smalltalk's [Classboxes][] and C#'s [extension methods][]. At some
point I realised that these problems just emerge naturally from these models
themselves: putting data and behaviour together.

Some languages tackle this problem in a different way. [Us][], an experiment on
Self that never really got a full implementation, stores data and behaviours
together, like in Self, but one object may have multiple sets of behaviours
(called “perspectives” in Us). [CLOS][] has data and behaviours separated, where
each method provides defines how it selects the operation for the given
arguments. Multimethod languages aren't very popular, but the concept has been
around for a long time. [Korz][] merges multimethods and context-oriented
programming—where dispatch takes an implicit "context" argument.

Siren's new model is influenced by all of these, but also by Clojure's ad-hoc
hierarchies. If there's something I particularly dislike in languages in general
is how they treat hierarchies as a static concept, where there's only ever one
possible hierarchy. However, hierarchy is more often than not diverse and
contextual. [Roles][] in role-oriented programming captures the idea of
categorisation in a much better way.

> **Fun fact:** I only really got to this model when I tried modelling OCS
> permissions with the concept of Brands in the first version of Siren. At this
> point I have no idea how to extend this concept to support distributed
> capabilities, but it should be possible.


## The model

In Siren we have a few core concepts:

  - A **subject** is a piece of data with an identity and its brands.
    Identity in Siren is not observable, and brands can be modified or
    queried in limited forms. Brands, not identity, are used for
    dispatch.
  - A **method** is a function that can be specialised for particular
    capabilities.
  - A **context** is a first-class set of methods supporting [Traits]-like
    symmetric composition operations.
  - A **brand** is a first-class, hierarchy-aware unique identifier that
    may be associated with many objects. Brands can be added or removed at
    any point in time, subject to some restrictions.
    
Common object-oriented concepts arise from the combination of these concepts:

  - **Identity**: each subject has an internal identity, but this identity is
    not used for dispatching, and there's no identity equality by default (it's
    not *impossible* to add, but it's fairly difficult). Not having observable
    identity allows conceptual supersets of a subject A to behave exactly like A
    would, and thus removes the need for things like Wrappers and Adaptors when
    extending existing behaviour.
    
  - **Hierarchy**: in typed languages, and in most languages that support
    inheritance, there's a concept of hierarchy and subtyping. Interfaces make
    hierarchies less restricted, and allows a limited form of
    multiple-hierarchies to be attached to a particular object. Siren
    generalises this concept with Brands. Brands also play the role of
    capabilities in OCS.
    
  - **Inheritance**: while this happens in very different ways in
    object-oriented languages, it's often used to reuse behaviours from a
    particular class of objects. Some prototype-based languages just concatenate
    the methods from several objects to build new ones, like in mixins but
    without the Class aspect of it. 
    
    Siren 1 had delegative-inheritance as in Self, and concatenative-inheritance
    as in mixins. Things are a bit more complex in Siren 2. In a sense,
    hierarchies create subtyping relationships, and these subtyping
    relationships are used by the dispatch algorithm, such that if A ⊂ A', and a
    method is defined for A, then it's also defined for A'. On the other hand,
    contexts provide Trait-like operations that allow concatenating two contexts
    together, in a similar fashion to concatenative-inheritance in some
    prototype-based languages—conflicts still have to be resolved explicitly as
    Siren does not allow ambiguous dispatch.
    
  - **Behaviours/Dynamic dispatch**: operations are selected at runtime, based
    on the arguments provided to those operations. In Siren, methods handle the
    dispatch, and the operations are selected based on the brands associated
    with the provided arguments.
    
  - **Objects**: Siren can't have objects in the way Kay defines them (state is
    not local), but Contexts are objects in the way [William Cook][cook] defines
    them. I am not particularly interested in following either definitions of
    object now, so it's more like Siren incidentally fits that definition.
    
Other object-oriented concepts, and how they could exist in Siren:

  - **Mutable state**: Siren doesn't have any concept of mutability in its model
    (or in most of the standard library). Cell is a type that's available for
    some privileged code that allows restricted mutable storage (where storage
    can be memory, but in the standard library will most likely be a persistent
    versioned storage, to support live programming with time travel—the
    difference can't be observed from the program), and mutating is just handled
    by regular dispatch to privileged operations.
    
  - **Classes**: Siren doesn't have classes. But as in Self, one could implement
    them using contexts, methods, and subjects. Particularly I find classes to
    be a bad idea in object-orientation, although they tend to be not as bad
    when people don't mix them with types and hierarchies.
    
  - **Reflection**: Siren is a language with a live environment, and thus
    reflection is essential for the tooling. That said, Siren uses mirror-based
    reflection, and only exposes this to very privileged code, since reflective
    capabilities allow people to break language guarantees—a dangerous thing if
    exposed to untrusted code, or even trusted code that could misuse it.

Right now, these concepts
are
[partially implemented as a JavaScript library](https://github.com/robotlolita/contextual-multimethods),
and
[partially implemented as a tree-walking interpreter in a separate branch in the Siren repo](https://github.com/siren-lang/siren/tree/siren2).
Hopefully I can find more time to implement the new Siren interpreter soon…


## Extensibility in programming

One of the main problems I've tried to tackle with Siren is extensibility and
modularity, so it makes sense to present the model in the context of this
problem. 

Most languages have very bad support for *modular* extensions.
The [Expression Problem][] covers parts of this, and it's not even hard to see
how bad this support is for most languages, but issues go much further when you
consider programming in broader social contexts. For example:

Alissa writes a component that allows some values to be compared for equality.
Meanwhile Max writes a component that provides the concept of a 2d point.
Alissa's component knows nothing about Max's component, and vice-versa. Now
Talib wants to use both Alissa's component and Max's component. In order to
compare 2d points Talib has to do one of these, depending on the language:

  - Modify Alissa's source code to support Max's 2d points (functions with
    static dispatch);
  - Modify Max's 2d points to include support for comparison (objects);
  - Globally provide Alissa's component with a specialisation for Max's 2d
    points (type classes, multimethods, protocols, etc);
  - Locally provide Alissa's component with Max's 2d points, or locally provide
    Max's 2d points with an equality concept (extension methods, Scala's
    implicit calculus, etc);
    
The first two are obviously terrible (Talib may not even have access to Alissa's
and Max's source code), and that's actually the case for **most existing
programming languages**. The third is also terrible, because global coherence in
those concepts is *inherently not modular*, and now that modification is going
to be incompatible with other libraries. The last case might look less bad at a
glance, but it leads to *global incoherence*—and in practice suffers from creating
conflicts that can't be resolved in code, or at least not in a way that can be
shared with othere people.

Solving these problems is, of course, very difficult. If it wasn't, people would
have already solved it. Siren does not solve it, but it addresses some of the
major pain points in ways that I find particularly satisfactory.

- - -

Alissa provides her concept of equality for some values:

```ruby
:siren/2

module Data.Equality platform: Platform where

  import (Platform module: `Data.Boolean) exposing (True, False, Boolean, &&).
  import (Platform module: `Data.List) exposing (::, Empty, List).
  
  export
  define (True a) === (True b)       = True
       : (False a) === (False b)     = True
       : (Boolean _) === (Boolean _) = False
       
  export
  define (List a) === (List b) =
    a match: {
      define a-value :: a-rest =
        b match: {
          define b-value :: b-rest = (a-value === b-value) && (a-rest === b-rest)
        }.
        
      define Empty = b empty?
    }.
```

Max provides their concept of 2d point:

```ruby
:siren/2

module Data.Point-2d platform: Platform where

  import (Platform module: `Core.Context) exposing (restrict:)
  import (Platform module: `Data.Struct) exposing (struct, builder).
  import (Platform module: `Data.Number) exposing (Number, describe, +).
  import (Platform module: `Debug.Text) exposing (Debug-Text).
  
  # `use` is basically an `import` that imports the entire 
  # context in a new, isolate scope.
  export
  let Point-2d = use struct in 
                   Point-2d 
                     field: "x" type: Number default: 0;
                     field: "y" type: Number default: 0.
                 end
                     
  import Point-2d exposing (x, y).
  export x.
  export y.

                   
  export
  define (Point-2d base-point) x: (Number x) y: (Number y) =
    use base-point builder in
      x: x;
      y: y;
      build.
    end
                   
  export
  define (Point-2d point) describe =
    Debug-Text, "<Point-2d x: ", point x describe, 
                          "y: ", point y describe,
                          ">".
                          
  export
  define (Point-2d a) + (Point-2d b) =
    Point-2d/x: (a x + b x)
             y: (a y + b y).
```

Talib wants an `Data.Equality` library that supports Point-2d. He has many options,
depending on what his goals are. If only local coherence is desired, Talib can
simply import the two libraries and extend them *locally*:

```ruby
:siren/2

module Talib.Great.Module platform: Platform where

  import (Platform module: `Data.Boolean) exposing (&&).
  import (Platform module: `Data.Equality) exposing (===).
  import (Platform module: `Data.Point-2d) exposing (Point-2d, +, describe, x:y:, x, y).
  import (Platform module: `Debug.Show) exposing (show:)

  define (Point-2d a) === (Point-2d b) =
    (a x === b x) && (a y === b y).

  export 
  define main do
    let a = Point-2d x: 10 y: 20.
    let b = a x: 20 y: 30.
    
    # `Context` is the current scope, basically. You need to pass it to
    # a function if you want it to have access to any methods you're seeing
    # locally.
    Context show: 1 === 1.
    Context show: a === a.
    Context show: (a + a) === (b + a).
  end
```

If Talib wants to provide a globally coherent Equality concept for his
application, he just writes his own `Data.Equality` module that extends Alissa's
module.

A top-level configuration then defines that Talib's `Data.Equality` module only
sees Alissa's `Data.Equality` module in its search space, while every other
module only see Talib's `Data.Equality` in their search space. Siren uses a
module system heavily based
on
[David Barbour's constraint-based modules](https://awelonblue.wordpress.com/2011/09/29/modularity-without-a-name/).
The [Modules and Distribution](modules-and-distribution.md) note in this
repository covers some of it, but I haven't finished writing it yet Orz.


```ruby
:siren/2

module Data.Equality platform: Platform where

  import (Platform module: `Data.Equality) exposing (===).
  import (Platform module: `Data.Point-2d) exposing (Point-2d, x, y).
  import (Platform module: `Data.Boolean) exposing (&&).

  # Note that this does NOT mutate the original === definition.
  # Import *clones* the multimethod, so the definition becomes local.
  export
  define (Point-2d a) === (Point-2d b) =
    (a x === b x) && (a y === b y).
```

If there's another type that should behave like a Point-2d, Talib
can just attach the `Point-2d` capability to it—although if conflicts arise in
dispatch, these would have to be resolved too (the good new is: they *can* be
resolved locally or globally, the bad new is: it's a lot of work):

```ruby
:siren/2

module Data.Equality platform: Platform where

  import (Platform module: `Data.Equality) exposing (===).
  import (Platform module: `Data.Point-2d) exposing (Point-2d, x:y:).
  import (Platform module: `Tais.Point-2d) exposing (Point-2d as P2d).
  
  initialization do
    Point-2d/brand attach-to!: P2d.
    use P2d in
      alias-field: "a" to: "x".
      alias-field: "b" to: "y".
    end
  end
  
  export
  define main do
    (P2d x: 1 y: 2) === (P2d x: 1 y: 2). # => True
    (P2d x: 1 y: 2) === (Point-2d x: 1 y: 2). # => True
  end
```

All of these definitions can be shared, by making a module that can be imported
by other applications. This allows third-parties to resolve conflicts or add
integrations between libraries and ship these integrations without touching any
existing source code.



[Classboxes]: http://scg.unibe.ch/archive/papers/Berg03aClassboxes.pdf
[extension methods]: https://msdn.microsoft.com/en-us//library/bb383977.aspx
[Us]: http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.56.7535
[CLOS]: https://en.wikipedia.org/wiki/Common_Lisp_Object_System
[Korz]: http://dl.acm.org/citation.cfm?id=2661147
[Roles]: https://en.wikipedia.org/wiki/Role-oriented_programming
[Traits]: http://scg.unibe.ch/research/traits
[cook]: http://wcook.blogspot.com.br/2012/07/proposal-for-simplified-modern.html
[Expression Problem]: http://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt

