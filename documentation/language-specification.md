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
 *  Strict, eager, applicative-order, run-to-completion;
 *  Built-in Monad support (for sequencing actions, not for achieving purity);
 
Besides the language takes uses a Smalltalk inspired syntax, which is as simple
as Lisps', but in my humble opinion, easier to use without a good text editor,
like DrRacket, or Emacs with Paredit. While it is the long-term goal to provide
a good live-programming environment as a mixture of DrRacket with Smalltalk VMs,
I do not think there will be enough time for working on that for now.


1) Overview
2) Concepts
3) Program structure
4) Standard library
5) Formal syntax
