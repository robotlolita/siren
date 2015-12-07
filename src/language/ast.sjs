// # module: siren.ast
//
// The nodes that constitute the Abstract Syntax Tree in Siren are
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
  GlobalObject { meta: Object },
  Hole         { meta: Object },
  Module       { meta: Object, args: Array, exports: *, body: Array },
  Comment      { meta: Object, comment: String },
  Id           { meta: Object, name: String },
  Free         { meta: Object, selector: Id },

  Lambda  { meta: Object, self: Id, args: Array, body: Array },
  Block   { meta: Object, args: Array, body: Array },
  Num     { meta: Object, value: Number },
  Int     { meta: Object, sign: String, value: String },
  Str     { meta: Object, value: String },
  Vector  { meta: Object, value: Array },
  Record  { meta: Object, value: Array },

  Let    { meta: Object, name: Id, value: Expr },
  Apply  { meta: Object, selector: Id, target: Expr, args: Array },
  Clone  { meta: Object, source: Expr, bindings: Record },
  Extend { meta: Object, source: Expr, bindings: Record },
  Return { meta: Object, value: Expr },
  Use    { meta: Object, traits: Array, exprs: Array },
  Using  { meta: Object, traits: Array },
  Assign { meta: Object, selector: Expr, value: Expr },
  Var    { meta: Object, selector: Id },
  Global { meta: Object, selector: Id },
  Do     { meta: Object, actions: Array }
} deriving (Base)

Let::isStatement = true;


union DoClause {
  Action { meta: Object, binding: Id, expr: Expr },
  Return { meta: Object, binding: Id, expr: Expr },
  MultiReturn { exprs: Array }
} deriving (Base)


exports.Expr = Expr;
exports.DoClause = DoClause;
