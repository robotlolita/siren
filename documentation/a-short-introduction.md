# A Short Introduction to Siren

Siren is a prototype and context-based programming language. In this
tutorial you'll learn what this means in practice, and how to write and
interact with programs in Siren using the language tools.

As a language with designed for interactive development, this tutorial
will make extensive use of Siren's REPL tool.

> **NOTE**  
> Siren is still an experimental language. Not only are the semantics
> and syntax described in this tutorial subject to change, but the
> compiler is very alpha-quality right now, and generates fairly
> inefficient code.


## Installation

There are not pre-built packages of the Siren compiler at the time, so
it's necessary to compile a few things.


### Pre-requisites

Before we continue, you'll need these tools:

- [GNU Make](https://www.gnu.org/software/make/)
- [Node.js](https://nodejs.org/en/)
- A C++ compiler, like [GCC](https://gcc.gnu.org/) or [clang](http://clang.llvm.org/)
- Headers for the [OpenSSL library](https://www.openssl.org/)
- [Git](https://git-scm.com/) (or you can download a zip from Github)


> If you're on a Debian/Ubuntu-based machine, you can get all of this with
> these commands:
> 
>     $ sudo apt-get install build-essential libssl-dev
> 
> You can get Node.js from [NodeSource](https://nodesource.com/), or
> install it from the official binary packages, or use a tool like
> [nvm](http://nvm.sh) to manage the installation for you.
> 
>     $ curl -sL https://deb.nodesource.com/setup_4.x | bash -
>     $ apt-get install -y nodejs


#### Building the compiler and REPL

Clone the repository (or
[download a zip](https://github.com/siren-lang/siren/archive/master.zip))
to get Siren's source code:

```shell
$ git clone https://github.com/robotlolita/siren.git
```

Once that's done, you can change to the source directory and run the
build commands:

```shell
$ cd siren

# This will pull out all dependencies for the project from the internet
$ npm install

# This will compile the compiler, REPL, and runtime
$ make all
```

To make sure everything is okay, try invoking the REPL. You should see
something like this:

```shell
$ bin/isiren 
Type :quit to exit (or ^D).

> 
```


## Interacting with Siren

Siren is a language designed for interactive development. As such, most
of the development should happen from inside the interactive shell
(REPL). To invoke it, execute the `isiren` application from the command
line:

```shell
$ bin/isiren 
Type :quit to exit (or ^D).

> 
```

A REPL works by waiting for expressions to be typed on the screen, and
then evaluating those expressions and presenting the result right
away. You can try it by writing a famous first program: `"Hello,
world!"` and pressing `return`:

```ruby
> "Hello, world!"
# => "Hello, world!"
```

As you see, the Siren REPL has evaluated your expression and replied
with its result. In this case, the result happens to be the same
expression you've entered. That's because `"Hello, world!"` doesn't
really do any computation, it just represents a value.

Let's try with something different. For example, an arithmetic
expression:

```ruby
> 10 + 20
# => <Integer: 30>
```

Now we can see that our expressions are indeed being evaluated. The
arithmetic expression `10 + 20` gives back the integer `30`, as one
would expect.


## A world of objects

As an object-oriented language, Siren's *world* is entirely made of
objects. Objects are little entities that can perform computation in
Siren, and all computations are done by asking an object to do
something.

How do we ask an object to do something? We send it a message. In fact,
when we wrote `10 + 20` before, we were sending the number `10` the
message `+ 20`.

A message is a name and a list of arguments. Messages identify
operations inside an object within a particular context (we'll see more
about contexts later). In the message `+ 20`, the name of the message is
`"+"`, and the list of arguments is `[20]`.

Siren supports more than just messages with symbols in them, of
course. There are three types of messages in Siren:

 -  **Unary**, are messages that don't take any argument. These identify
    operations that depend only on the object they're sent to. The name
    of an unary message needs to start with a letter or number, and may
    contain any other character afterwards, but can't be the same as a
    reserved word.

    An example of unary message is the `successor` on numbers, which
    identifies the operation that returns the successor of a number:

        > 10 successor
        => <Integer: 11>

        > 10.0 successor
        => <Float(64): 11.0>

 -  **Binary**, are messages that take one argument. These identify
    operations that depend on the object they're sent to, and one other
    value. The name of a binary message can only contain symbols, but it
    can be any combination of symbols.

    Examples of binary messages are `+`, `-`, `**`, `>=`, and others:

        > 10 + 20
        => <Integer: 30>

        > 1 > 2
        => <False>

 -  **Keyword**, are messages that take one or more arguments. These
    identify operations that depend on the object they're sent to, and a
    handful of other values. A keyword message can contain any
    character, besides whitespace and reserved ones.

    Keyword messages are very different from most other programming
    languages because they're written in mix-fix style. For example,
    numbers respond to a keyword message named `between:and?:`, taking
    two arguments (`n` and `m`), which determines if the number is
    greater or equal `n`, or less than or equal `m`. However, this
    message is written like so:

        > 10 between: 1 and?: 10
        => <True>

    Note that the arguments go after each colon in the message name, not
    after the entire message name. This is very different from most
    languages, where you'd write something like `10.between(1, 10)`.


When combining messages, it's important to note that Siren evaluates all
messages from left to right, and all messages of the same type have the
same precedence. Siren defines precedence rules as follows:

    Unary > Binary > Keyword

In practice, this means that you don't need to wrap expressions in
parenthesis when sending a message one level up the precedence chain, so
if you write:

```ruby
10 between: 1 successor + 2 and?: 10 predecessor
```

Siren will understand it as if you had written:

```ruby
(10) between: (((1) successor) + (2)) and?: ((10) predecessor)
```

> **WARNING**  
> Caution has to be taken when entering arithmetic expressions in Siren,
> however, because the usual precedence rules don't apply. That is, the
> following expression:
> 
>     2 * 3 + 3 * 2
> 
> Is interpreted by Siren as if you had written:
> 
>     (((2 * 3) + 3) * 2)
> 
> And not:
> 
>     (2 * 3) + (3 * 2)
> 
> Giving you back the integer `18`, instead of the expected result `12`.


## Inspecting objects

You can expect the usual operators defined on numbers (`+`, `-`, `*`,
...), but how do you know all the things you can do with numbers, and
what all of these operations do, precisely? Well, Siren allows you to
inspect objects in the REPL and understand what you can do with
them. This feature is exposed through the `Browser` object.

For example, to see what you can do with a floating point number, you
point the `Browser` object to the floating point number, then send it
an `inspect` message.

```ruby
> browse object: 1.0; inspect
# (Anonymous object)
# ==================
# 
# 
# (No documentation)
# 
# 
# 
# Messages in (Anonymous object)
# ------------------------------
# 
# Inheriting from Float-64bits
# ----------------------------
# 
# (Uncategorised):
#   • self describe
#   • self as-integer
#   • self as-text
#   • self as-float
#   • self integral?
#   • self fractional?
#   • self === n
#   • self =/= n
#   • self between: n and?: m
#   • self clamp-between: n and: m
#   • self compared-to: n
#   • self < n
#   • self <= n
#   • self > n
#   • self >= n
#   • self min: n
#   • self max: n
#   • self + n
#   • self negated
#   • self - n
#   • self * n
#   • self ** n
#   • self absolute
#   • self / n
#   • self divided-by: n
#   • self modulo: n
#   • self remainder: n
#   • self divisible-by?: n
#   • self successor
#   • self predecessor
#   • start to: end
#   • self expatriate-to-JS
# 
# Inheriting from Numeric
# -----------------------
# 
# (Uncategorised):
#   • _ describe
#   • _ exceptions
# 
# Inheriting from Object
# ----------------------
# 
# (Uncategorised):
#   • self does-not-understand: message
#   • self perform: message in: context
#   • self refined-by: object
#   • self refined-by: object in: context
#   • self extended-by: object in: context
#   • self extended-by: object
#   • self describe
#   • self => value
#   • self expatriate-to-JS
#   • self ==> that
#   • self =/=> that
# 
# => <Browser for: <Float(64): 1.0>>
```

You can see that the number `1.0` itself (described as an `Anonymous
Object`) doesn't respond to any message, but it inherits from
`Float-64bits`, which defines several messages that we've used before,
like `+`, `*`, and `**`, as well as other messages such as `integral?`
and `successor`.

Let's try to get more information about the `integral?` message. You can
do this by sending the message `message:` to the `browse` object,
with the name of the message, then sending it an `inspect` message:

```ruby
# Note that the name of the message is a text
> browse object: 1.0; message: "integral?"; inspect
# def self integral?
# ---------------------------
# 
# 
# 
# Source for integral?
# --------------------
# 
#    def self integral?
#        vm if: (vm float/is-integer: self)
#           then: True else: False.
# 
# 
# Belongs to: Float-64bits
# From: /home/quil/Personal/siren/runtime/Numeric.js at line 152, column 3
# 
# => <Message-Browser for: <Unbound-Method arity: 1>>
```

From this you can see the documentation of the function, some usage
examples, and how the function was categorised by its author. We can try
those examples to see what they do:

```ruby
> 1.1 integral?
# => <False>
> 1.0 integral?
# => <True>
```

And indeed, the result expected by the example is the one we get.


## Arithmetic in Siren

Siren tries to provide good defaults for the programmer, so using
features that aid in writing correct programs is favoured over features
that would be faster, but easy to misuse.

Given this, Siren divides numbers in two categories:

 -  `Integer`, which represents integral numbers with arbitrary
    precision. This means that there are no hard limits on the which
    integral number you can represent in Siren, besides what your computer
    memory's can store. The expression `2³³³ * 3²²²` can be expressed
    naturally in Siren, without any loss of information or precision.

        > (2 ** 333) * (3 ** 222)
        => <Integer: 145,850,225,146,352,389,694,414,219,810,542,047, ...
                     370,451,305,664,251,912,213,054,467,447,156,375, ...
                     988,858,444,830,305,342,442,283,842,331,614,428, ... 
                     525,657,034,353,275,761,934,767,020,548,438,396, ...
                     350,009,609,121,453,495,482,397,390,098,896,758, ... 
                     843,735,174,009,204,415,322,390,528>

 -   `Float-64bits`, which represents fractional numbers as floating
     point numbers, up to 64 bits of precision.

> **NOTE**  
> Siren will try to keep the most precise number for you, and will convert
> it to less precise numbers if it can't represent things precisely (e.g.:
> adding an integer `1` to a floating point `2.0` is still an integer `3`,
> but adding an integer `1` to a floating point `1.1` gives you a floating
> point `2.1`).

Numbers are created using the number literals:

- Integers: `1`, `10_345`, ...;
- Octal integers: `0o777`;
- Hexadecimal integers: `0xFF`;
- Binary integers: `0b110110`;
- Floating point numbers: `2.0`, `23_344.455`.

All numeric literals in Siren accept the `_` character, which can be
used to separate thousands for better readability:

```ruby
> 1_234_567
# => <Integer: 1,234,567>
```

## Working with text

The `Text` object in Siren is used to represent texts. This is similar
to what most other languages call `String`, in various ways. In Siren,
`Text` is an opaque representation of a text, however, not a list of
characters.

Texts are created either with simple quotes:

```ruby
> "Hello!"
# => "Hello"
```

Or with triple quotes:

```ruby
> """Hello!"""
# => "Hello"
```

The difference between them being that you don't need to escape quotes
inside texts with triple quotes. Both text literals support line breaks
inside of them:

```ruby
> "This
... is
... a
... long
... text"
# => "This
# is
# a
# long
# text"
```

Texts can be concatenated through the concatenation message (`,`):

```ruby
> "Hello", " ", "world!"
# => "Hello world!"
```

They can also be compared to other texts (with `===`, `=/=`, etc), or
portions of text (with `contains?:`, `starts-with?:`, `ends-with?:`,
etc), but you can't directly look at the contents of a text. There's no
such thing as an "find in which position of the text the character 'X'
appears". This is by design.

In order to look at the contents of a text object you need to acquire a
particular *view* to these contents. One of such views is the
`Character-View` view, which allows one to look at a text as a sequence
of `Character` objects:

```ruby
> "Hello" characters
# => <Character-View(<Integer: 1>, <Integer: 5>): "Hello">
```

You can restrict a view of characters with the `slice-from:to:` message,
and look at individual characters with `at:`. Note that unlike most
programming languages, Siren uses 1-based indexing, so the first
character is at 1, not 0.

```ruby
> let chars = "Hello" characters
> chars at: 1
# => <Character: "H">
```

If you refine the view, a different character would be at the
index 1. Note that restricting a view only changes where the view is
looking at, it doesn't copy any text in memory.

```ruby
> let chars-2 = chars slice-from: 2 to: 4
> chars-2
# => <Character-View(<Integer: 2>, <Integer: 4>): "ell">
> chars-2 at: 1
# => <Character: "e">
```

### A quick note about Text vs. Debug-Text

Siren differentiates between `Text` and `Debug-Text`. The first is an
object used to represent text that's supposed to be manipulated by the
program. `Debug-Text`, on the other hand, is an object used to represent
text that's going to be displayed in the REPL, to show information to
the programmer.

You can create a `Debug-Text` by concatenating the object with any other
text:

```ruby
> Debug-Text, "Hello"
# => Hello
```

Note that, different from `Text`, the `Debug-Text` output is shown to
the user without being wrapped in quotes. This allows Siren to
differentiate the representation of the various objects it has in the
system, without compromising their representation. Since `Debug-Text` is
only used for this tiny and specific use case, its representation can't
conflict with any other object.

Also note that once you convert something to a `Debug-Text`, you can't
convert it back. `Debug-Text` is completely opaque, and can't be
inspected or viewed, like `Text` can.


## Working with objects

We've seen how to work with some common values in programming. But
underneath, they too are just objects. So, it would make sense to
understand what objects are, how they come into life, and how to use
them.

Siren uses objects to model its interactive world. An object is an
entity that knows how to do work, and each of these pieces of work is
identified by a "message". One may ask an object to do a particular
piece of work by sending that object a message. As we've said before,
something like `2 + 3` is just sending a message to the object `2`, it's
`2` who decides what `+ 3` means.

To trace a parallel with the real world, imagine that you've asked your
friend, let's call them Max, to imagine a number. Max, then, without
telling you, chooses the number `2`. You can't really look inside Max's
head, but you can ask them to do operations to the number they've
chosen. So, let's say you ask "Max, add 3 to the number you've
chosen". Max then proceeds to compute that. You still don't know what's
the number Max's got. But you can ask "Max, describe the number you have
right now," to which Max could reply "It's the number 5". But they could
also reply "It's bigger than 4, but smaller than 6. It's also an
integral number".

Numbers (and everything else) in Siren works exactly like Max. They have
some internal values they're looking at, but you can't **see** those
values. The only thing you can do is ask those objects to operate on and
describe those values for you.

Let's try to make this exercise more practical by modelling these
objects in Siren ourselves. For this, we'll consider the simple
[Fizz Buzz](https://en.wikipedia.org/wiki/Fizz_buzz) game:

> Fizz Buzz is a game to teach children division. It can be played by
> having them sit in a circle, and designating one of the children as
> the number "1". Each children gets a number that is the successor of
> the previous one, and in their turn, they must say the number they've
> got, with the catch that, if the number is divisible by 3 they must
> say `Fizz`, instead. If the number is divisible by 5, they must say
> `Buzz`. And if the number is divisible by both 3 and 5, they must say
> `Fizz Buzz`.

Now, that's a lot to take in at once, so let's try breaking the problem
down a little bit to understand it better. For simplicity, let's assume
we have an infinite number of children:

- Each children represents one number, starting from 1, and increasing
  by 1 with each children.
- If a children represents a number that is divisible by 3, they
  have to say "Fizz".
- If a children represents a number that is divisible by 5, they
  have to say "Buzz"
- Consequently, if a children represents a number that is divisible by
  both 3 and 5, they'll say "Fizz Buzz".
- If the number is not divisible by either 3 or 5, they have to say the
  number.

We can start by modelling what each children can say. They can say
numbers, which Siren already has, but they can also say `Fizz`, `Buzz`,
and `Fizz Buzz`, which Siren doesn't have yet. So, the first task is to
model these possibilities as objects.

To construct an object in Siren, one refines an existing object and adds
the new messages they need. In order to reduce the amount of work, it
makes sense to refine an object that has the closest set of messages to
the one you want. Since neither of the three objects we'll create
require any special message, we'll refine the base object:

```ruby
> let Fizz = Object {
... def self as-text = "Fizz".
... }
> let Buzz = Object {
... def self as-text = "Buzz".
... }
> let Fizz-Buzz = Object {
... def self as-text = Fizz as-text, Buzz as-text.
... }
```

An object is a collection of messages. Messages are defined with the
`def` keyword, and they have much the same syntax we use to invoke those
messages in the objects, with the difference that where we'd have
expressions, we have names that will refer to those expressions when the
message is sent. So, for example, if we do `Fizz as-text`, `self`
inside that message will be `Fizz`.

> **NOTE**
> The `=` after the message is optional. Siren supports it so messages
> that are defined in a single line are easier to read, but usually
> expressions are placed in an indented block under the message header.

The `let name = value` form gives the value an alias `name`, such that
saying `name` becomes the same as saying `value`. We can try this
by writing `Fizz-Buzz`:

```ruby
> Fizz-Buzz as-text
# => "FizzBuzz"
```

> **NOTE**  
> Since refining the base `Object` is such a common operation, Siren
> lets you leave it out altogether, such that `{ ... }` is equivalent to
> `Object { ... }`.

Now that we can have the children say all they need to say in the game,
we can move on to the players of the game. As previously said, a player
is a children that represents a number, and they have to say different
things depending on what the number they represent it.

Players in the game behave in the very same way, and the only difference
between them is which number they represent. Instead of creating an
entirely new object by repeating all of the things a player can do in
each one of them, we can capture the common things in an object, and
reuse it — just like `Object` was reused by out previous ones. We'll
call this common object `Fizz-Buzz-Player-Trait`:

```ruby
> let Fizz-Buzz-Player-Trait = {
... def self describe = Debug-Text, "<Children ", self number as-text, ">".
... def self say
...   (self number divisible-by?: 3) && (self number divisible-by?: 5) then: {
...     ^ Fizz-Buzz.
...   }.
...   (self number divisible-by?: 3) then: {
...     ^ Fizz.
...   }.
...   (self number divisible-by?: 5) then: {
...     ^ Buzz
...   }.
...   self number.
... }
```

We've also given the Trait a `describe` message. When the REPL wants to
show an object to the user, it sends that object a `describe`
message. The object can then decide how it wants to present itself. The
base object, `Object`, defines a `describe` message that just outputs
the name meta-data of the object, so `Fizz describe` would be
`<Fizz>`. We'd like the player trait to have a more useful description,
so we included the number they represent.

> **NOTE**  
> For messages that have multiple expressions, Siren requires
> them to be separated with a period (`.`). The last expression in a
> message is automatically returned. Siren also supports blocks (`{
> expression here }`), which allow one to pass expressions from one
> message to another. Inside a block, you can use `^ <expression>` to
> return a value from the message that defined the block.

We can test if our `Fizz-Buzz-Player-Trait` object says the correct
things by providing it with a number:

```ruby
> (Fizz-Buzz-Player-Trait { def _ number = 15 }) say
# => FizzBuzz

> (Fizz-Buzz-Player-Trait { def _ number = 7 }) say
# => <Integer: 7>
```

Now that we've got our foundations in place, we can tie all of them up
in a cohesive `Fizz-Buzz-Game` object, which controls the turns of the
children who're playing the game. For simplicity, we'll consider numbers
from 1 to 100.

> **NOTE**  
> As a convenience, you can avoid the parenthesis in an expression by
> using the `;` chaining operator. `a + b; c` is equivalent to `(a + b)
> c`


```ruby
> let Fizz-Buzz-Game = {
... def self play
...   1 to: 100; each: { number |
...     let player = Fizz-Buzz-Player-Trait { def _ number = number }.
...     Console write!: player say as-text, ", ".
...   }
...   Console write-line!: "".
... }
```

The definition of `play` is a little bit more complicated than what
we've seen so far. First it creates a range of numbers, from `1` to
`100`, inclusive. Then, for each `number` in this range, we create a
player for that number, and have that player say its number. To show
this information on the screen we use the `Console` object, whose
`write!` and `write-line!` messages allow us to display things on the
screen (they only accept text, so we have to ask the values we've got to
convert themselves to Text by sending them the `as-text` message).

If you play the game, you'll see the children saying their numbers
correctly:

```ruby
> Fizz-Buzz-Game play
# 1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14,
# FizzBuzz, 16, 17, Fizz, 19, Buzz, Fizz, 22, 23, Fizz, Buzz, 26,
# Fizz, 28, 29, FizzBuzz, 31, 32, Fizz, 34, Buzz, Fizz, 37, 38, Fizz,
# Buzz, 41, Fizz, 43, 44, FizzBuzz, 46, 47, Fizz, 49, Buzz, Fizz, 52,
# 53, Fizz, Buzz, 56, Fizz, 58, 59, FizzBuzz, 61, 62, Fizz, 64, Buzz,
# Fizz, 67, 68, Fizz, Buzz, 71, Fizz, 73, 74, FizzBuzz, 76, 77, Fizz,
# 79, Buzz, Fizz, 82, 83, Fizz, Buzz, 86, Fizz, 88, 89, FizzBuzz, 91,
# 92, Fizz, 94, Buzz, Fizz, 97, 98, Fizz, Buzz,
# => <Future (pending)>
```







<!--
Local Variables:
ispell-local-dictionary: "british"
fill-column: 72
End:
-->

