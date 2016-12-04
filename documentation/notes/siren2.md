# Siren 2

Siren 2 is a major redesign that solves some of the problems in Siren 1, like modularity and expressiveness.


## Model

Siren 2 is based on very few concepts:

  - **Subject**, a *(Ids, State)* tuple;
  - **Context**, a trait-like container of multi-methods. Each scope creates one context;
  - **Multi-methods**, symmetric, dispatching on Ids;
  - **Brands**, for ad-hoc hierarchies that can be attached to Subjects;
  - **Modules**, parametric modules from Platform to Context.

## Syntax

Siren 2 has more special supporting syntax.

Modules:

```
:siren/2                                                             # PL version id

module Data/Boolean for: Platform where                              # module header (name, arg)

import (Platform module: Data) exposing (union).                     # import context in scope
import (Platform module: Block) exposing (Nullary as Fn0).           # renaming imports

# binding   = # arbitrary expression (lazily evaluated)
let Boolean = use union in True | False end.
let True    = Boolean True.
let False   = Boolean False.

# multimethod definition (`let` is just a special case of this)
export define (_ True)    && (_ True)    = True
            : (_ Boolean) && (_ Boolean) = False.

export define (_ False)   || (_ False)   = False
            : (_ Boolean) || (_ Boolean) = True.

export define (_ True)  then: (f Fn0) else: _       = f call
            : (_ False) then: _       else: (g Fn0) = g call. 
```

Cloning and defining objects:

```
let object = Object { 
  # regular closure block, but exports a context. Executed right away
}.
```

