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
them. This feature is exposed through the `Debug` object.

For example, to see what you can do with a floating point number, you
send the `inspect:` message to the `Debug` object giving the number as
an argument:

```ruby
> Debug inspect: 1.0
# (Anonymous object) {
# }
# 
# Inheriting from Float-64bits {
#   def self describe
#   def self as-integer
#   def self as-string
#   def self as-float
#   def self integral?
#   def self fractional?
#   def self === n
#   def self =/= n
#   def self between: n and?: m
#   def self compared-to: n
#   def self < n
#   def self <= n
#   def self > n
#   def self >= n
#   def self + n
#   def self negated
#   def self - n
#   def self * n
#   def self ** n
#   def self absolute
#   def self / n
#   def self divided-by: n
#   def self modulo: n
#   def self successor
#   def self predecessor
#   def start to: end
#   def self expatriate-to-JS
# }
# 
# Inheriting from Numeric {
#   def _ describe
#   def _ exceptions
# }
# 
# Inheriting from Object {
#   def self does-not-understand: message
#   def self perform: message in: context
#   def self refined-by: object
#   def self refined-by: object in: context
#   def self extended-by: object in: context
#   def self extended-by: object
#   def self describe
#   def self => value
#   def self expatriate-to-JS
#   def self ==> that
#   def self =/=> that
# }
# => <Debug>
```

You can see that the number `1.0` itself (described as an `Anonymous
Object`) doesn't respond to any message, but it inherits from
`Float-64bits`, which defines several messages that we've used before,
like `+`, `*`, and `**`, as well as other messages such as `integral?`
and `successor`.

Let's try to get more information about the `integral?` message. You can
do this by sending the message `inspect:message:` to the `Debug` object,
passing as arguments the object you want to inspect, and the name of the
message you want more information about:

```ruby
# Note that the name of the message is a text
> Debug inspect: 1.0 message: "integral?"
# def self integral?
#    Tests if the number is an integral number.
# 
#    Floating points are integral if they don't have any number
#    after the dot. So `1.0` is an integral number, whereas `1.1`
#    is a fractional one.
# 
# Examples:
#   { 1.1 integral?  ==> False }
#   { 1.0 integral?  ==> True  }
# 
# Category: Testing and Predicates
# 
# => <Debug>
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
- Octal integers: `0b777`;
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



<!--
Local Variables:
ispell-local-dictionary: "british"
fill-column: 72
End:
-->

