# Standard Library

Siren's standard library should provide a consistent and productive
environment out of the box for general computing.

Some currently open questions:

- How do we organise objects in the system? What is organisation
  *important* for?
- Do we expose `MessageBox`?
- Do we make scopes first-class?

## Core concepts

Siren's hierarchy has a few core objects, which reify internal concepts:

- `Root`, which is the basis of the entire Siren hierarchy. All objects
  must inherit from `Root`.

- `Module`, which represents all modules in the language. These are
  automatically created in every file.

- `Context`, which represents the mapping of message names to message
  selectors. These are automatically created in every lexical scope.

- `Selector`, which represents a message selector. These contain
  JS `Symbols`.

- `Message`, which represents a message send. These are, in theory,
  created every message send BUT we optimise this so we only create it
  in `does-not-understand:` and resends.

- `Perspective`, when you extend an object, you get back a
  `Perspective`. This is a thing that tells you how to install that
  extension in some `Context`.

- `Meta`, which is an object that describes meta-data about an
  object. It's a mapping of selectors to arbitrary values. This is only
  exposed through a mirror.

- `Block`, which represents free-functions in Siren.

- `Method`, which represents the computations pointed to by messages in
  objects. They are similar to `Block`, with the difference that the
  first argument is already specified/bound.

- `Brand`, which represents unique identifiers for objects, and allows
  strong tag checking (important for contracts).

- `Unit`, which represents nothing. Is used as a representation of no
  value, but **NOT** of an error, or "no object", so very different from
  `nil/null`. Errors are handled with a `Result` object.

- `Error`,


## Scalar types

- Reference (atomic reference)
- Boolean (True/False)
- Numbers (Byte, Unsigned-Integer-32bit, Unsigned-Integer-64bits, Integer-16bits, Integer-32bits, Integer-64bit, **Integer** (arbitrary-precision), Float-32bits, **Float-64bits**, Rational, Decimal)
- Text (Character)
- Date (Time, Date, Date-Time, Period) (should probably be based on clj-time)

## Container types

- Buffer
- Text (Text, Raw-Text (no encoding))
- Slice (view of part of a sequence)
- Collection (Pair, Tuple, List, Vector, Set, Ordered-Set, Map, Ordered-Map)
- Lazy Collections (Stream, Range, Lazy-List, Lazy-Vector, Lazy-Set, Lazy-Ordered-Set, Lazy-Map, Lazy-Ordered-Map)
- Result
- Concurrency (Task, Future, Channel (and buffers), Event)
- Isolates (Capabilities, Isolates, Communication Ports)


## Other libraries

- JS-Alien (JS interaction)
- Mirror (Object-Mirror, Meta-Mirror, Method-Mirror)
- Debug (inspecting, logging, tracing)
- Process
- File-System (Path, Node, File, Directory, Link)
- OS
- HTTP
- Contracts
- JSON
- Pretty Printing (probably using something similar to Wadler's pprint)
