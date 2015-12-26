# Organisation & Design

After fiddling with things for a Really Long Amount Of Time, I've
finally settled on what I consider to be a good way of structuring Siren
objects. Incidentally this is very similar to the approach Newspeak (but
also ML modules) takes **because** Newspeak has no global namespace, and
this was one of the few things I didn't shamelessly steal from them
ahaha.


## Designing objects

An Object in Siren is a self-contained module. It must define all of its
dependencies, and all of its behaviours. Since objects are such
monolithic things, we can divide it up in simpler concepts, however. So,
for Siren, an object is made out of:

- **Configuration**, which are the **only** parameters which modify the
  behaviour of the object. Additional configuration may be provided for
  each message in form of arguments, of course.

- **Meta-data**, which are pieces of information associated with an
  object, but which have no bearing on the actual behaviour of the
  object. Also because of this updating meta-data in Siren is considered
  a benign non-observable effect.

- **Behaviour**, which are operations that can be performed by an
  object, taking into account its current configuration.

- **Refinement**, which are operations that can refine an object (by
  modifying its behaviour or configuration). A refinement always gives
  you a new object which is a **strict superset** (It *must* adhere to
  Liskov's Substitution Principle  — bar Reflection) of the original
  object.

Given this, we can categorise objects in two groups:

- **Examples**, which are complete objects you can interact with right
  away, but *might* not have a very interesting behaviour before you
  refine them further.

- **Mixins**, which are incomplete objects meant to be either refined or
  incorporated into another object. Interacting with a mixin directly
  for purposes outside of refinement is considered an error.


## Approach to design

Given that we strive to provide a system where writing correct programs
is the natural thing to do (i.e.: Correctness By Design), it makes sense
to design the messages in an object such that independent of which
message we send, we **always** end up in a *valid* state of the
program. And this requires constraining access to incomplete objects.

As an example, the `Browser` object requires three different pieces of
configuration: `object`, `context`, and `display`. It so happens that
for all of these three there's a good default that can be used and
relieve people from providing too much information when trying to
interact with it. A Browser starts in the global object, within the
global context, and using a `Browser-Default-Display` for formatting
things.

From there, people can refine the browser, either by cloning the object
and modifying its configuration behaviours directly, or by sending the
`object:` and `context:` messages to it. Note that, in order to maintain
the other pieces of configuration, and added behaviours, a refinement
message always clones the target object, which in the case of `browse
object: Mirror` would be the object pointed by `browse`.

In the Browser, the `display` configuration determines how text will be
formatted in the display. It has things like "how to render markdown",
"how to render headings", etc. If one wanted to change these, they could
simply refine the display:

```ruby
let display = browse display.
let my-browse = browse {
  def self display = display {
    def _ heading!: text
      Console write-line!: "# ", text, "\n".
  }
}
```

Then using `my-browse` would display headings with a `#` preceded to the
text, rather than a border beneath the text, which is what the default
display object does.

The Browsing library also allows one to browse messages. Messages are
formatted in a different way than regular objects, so the library
separates this in a `Message-Browser` object. However, there's no way of
providing a default behaviour to this object, the user really needs to
configure it before they interact with it at all. To accommodate this,
the `Browser` object only allows creating *configured* `Message-Browser`
objects, by requiring one to send a `message:` message before they can
get a `Message-Browser`.


## Incomplete objects

Incomplete objects should describe their entire expected interface. The
`required` decorator is used to describe expectations, and the
documentation should give people enough information so they can
implement the required behaviours. E.g.:

```ruby
let Sum = {
  @required
  def self from: initial fold-with: reducer
    # Computes a single value by applying a binary message to the
    # values of this object and an accumulator.
    #
    # `from:fold-with:` is a structural transformation that allows
    # one to compute a value out of all of the contents of a
    # compound object.
    #
    # E.g.:
    #
    #     [1. 2. 3] from: 0 fold-with: _ + _ ===> (((0 + 1) + 2) + 3)
    unimplemented

  def self sum
    self from: 0 fold-with: _ + _
}
```


## Naming conventions

Siren uses a handful of naming conventions. And the approach outlined
above adds a few more. So, below is a complete list of conventions:

- `predicate?`, when a message tests something and returns either `True`
  or `False`, it gets suffixed with a question mark (`?`). Keyword
  messages will look like `foo:bar:baz?:`, binary messages don't follow
  this rule.

- `action!`, when a message results in an semantically observable,
  non-benign side-effect, it gets suffixed with an exclamation mark
  (`!`). Keyword messages will look like `foo:bar:baz!:`, binary
  messages don't follow this rule.

- `Some-Object-Name`, local objects are always defined in proper
  case. Objects that are not meant to be used directly (they only define
  links to other objects, or they need to be refined first) also get
  named in proper-case in messages.

- `some-object-name`, objects that are useful out of the box get named
  in all lower case.

- `mixins Some-Object-Name`, objects that are strictly meant to be mixed
  into another object (through the `mixin:` decorator) should be added
  to a `mixins` namespace in the module.


<!--
Local Variables:
ispell-local-dictionary: "british"
fill-column: 72
End:
-->
