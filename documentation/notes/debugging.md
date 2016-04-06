<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Debugging](#debugging)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Debugging

Printf-style debugging is something you need in Siren, and support to
this is, right now, as bad as any other language that relies on this.

We're basically interested in two things:

- Looking at human-readable representations of an object's *data*.
- Figuring out what we can *do* with the object.

This means that:

- All objects should have a representation of its *data*.
- It should be possible to inspect *any* object, regardless of how it's
  defined.

Siren has no solution for the second yet, and the solution for the first
is really bad.

The `describe` message can be defined on an object to provide a
representation of its data. This works fine for simple things:

```ruby
"Hello" describe.       # => Hello
1 describe.             # => <Integer: 1>
True describe.          # => True
```

But `describe` returns a **Text**, not some special construct. This
means that Text's `describe` implementation can only return itself. This
is a problem when representing text:

```ruby
let a = "<Integer: 1>"
# Is this a text or an integer? Impossible to know from the repr.
1 describe.     # => <Integer: 1>
a describe.     # => <Integer: 1>
# Does this tuple have one or two arguments? Impossible to know from the repr.
let a = "A. Hacker".
["A". "Hacker"] describe.   # => [A. Hacker]
[a] describe.               # => [A. Hacker]
```

To avoid this, the simplest solution is to use a special object for
representing debugging information (let's call it `Debug-Text`). This
lets `Text` have a representation that equals its literal form.

```ruby
["A". "Hacker"] describe.   # => ["A". "Hacker"]
"<Integer: 1>" describe.    # => "<Integer: 1>"
```

The only thing one can do with a `Debug-Text` object is put some text in
it. It's a one-way thing, once a text is in `Debug-Text` there's no way
to get it back, it can only be added to (with the concatenation operator
`,`) or used to output information by the VM from there on.

For the second problem, we don't want to put it in the object
itself. This requires reflection, and the information should be the same
for all objects. It makes sense to put it in a separate, `Debug` object.

So we have:

```ruby
Debug inspect: 1.
# => Integer {
#      def self describe
#      def self as-float
#      def self as-integer
#      def self === n
#      ( ... )
#    }
```

You can further inspect the messages of an object:

```ruby
Debug inspect: 1 message: "===".
# => (in Integer : Tests and Comparisons)
#    def self === n
#      # Tests that the integer `self` equals the number `n`.
#      # If `n` is a `Float-64bits` value, it's automatically
#      # converted to an `Integer` and compared.
#
#      vm assert/numeric: n
#      vm if: (vm integer: self equals: n)
#         then: True else: False.
#
#    Returns: Boolean
#
#    Examples:
#      1 === 1    ==> True
#      1 === 1.0  ==> True
#      1 === 2    ==> False
#
#    See also:
#      - def self =/= n   # Tests if numbers are not equal.
```
