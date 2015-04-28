// # module: mermaid.ast
//
// The nodes that constitute the Abstract Syntax Tree in Mermaid are
// defined in this file. All nodes contain a `meta` field, where we
// store meta-data about that node, such as argument names,
// documentation, line/column, filename, etc.
//
// This meta-data is reified in the generated file and can be inspected
// using the Mirror-based reflection functionality present in the
// runtime. Such functionality is only supported when we have WeakMaps
// for obvious reasons.

// -- Dependencies -----------------------------------------------------
var { Base } = require('adt-simple');

// ## adt: Expr
union Expr {
  Empty,
  Hole    { meta: Object },
  Program { statements: Array },
  Module  { meta: Object, args: Array, exports: *, body: Array },
  Comment { meta: Object, comment: String },
  Id      { meta: Object, name: String },
  Self    { meta: Object },

  Lambda  { meta: Object, args: Array, body: Array, bound: Boolean },
  Num     { meta: Object, value: Number },
  Str     { meta: Object, value: String },
  Vector  { meta: Object, value: Array },
  Record  { meta: Object, value: Array },

  Let    { meta: Object, name: Id, value: Expr },
  Bind   { meta: Object, target: Expr, selector: Id },
  Apply  { meta: Object, selector: Id, target: Expr, args: Array },
  Clone  { meta: Object, source: Expr, bindings: Record },
  Extend { meta: Object, source: Expr, bindings: Record },
  Var    { meta: Object, selector: Id },
} deriving (Base)

Let::isStatement = true;

exports.Expr = Expr;
