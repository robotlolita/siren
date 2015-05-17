// # module: mermaid.generation.resolve-bindings
//
// Correctly resolves bindings into `Var` and `Global` nodes.

// -- Dependencies -----------------------------------------------------
var { DoClause:Do, Expr } = require('../ast');


// -- Helpers ----------------------------------------------------------
function flatten(xss) {
  return xss.reduce(λ[# +++ #], [])
}

function contains(xs, x) {
  return xs.indexOf(x) !== -1
}

function collect(node) {
  return match node {
    Expr.Let(_, Expr.Id(_, name), _) =>
      [name],

    n @ Array => flatten(n.map(collect)),
    n => n
  }
}

function unpack(ids) {
  return ids.map(λ[#.name])
}

function propagate(scope, nodes) {
  return match nodes {
    [a @ Do.Action(_, Expr.Id(_, name), _), ...xs] =>
      [a] +++ propagate(scope +++ [name], xs),

    [a @ Do.Return(_, Expr.Id(_, name), _), ...xs] =>
      [a] +++ propagate(scope +++ [name], xs),

    [] => []
  }
}

// -- Transformation ---------------------------------------------------
function resolve(scope, node) {
  return match node {
    Expr.Free(m1, Expr.Id(m2, name)) =>
      contains(scope, name)?  Expr.Var(m1, Expr.Id(m2, name))
      : /* otherwise */       Expr.Global(m1, Expr.Id(m2, name)),

    Expr.Program(xs) =>
      Expr.Program(resolve(scope +++ collect(xs), xs)),

    Expr.Module(m, args, expt, xs) =>
      (scope +++ unpack(args) +++ collect(xs))
      |> λ(newScope) ->
           Expr.Module(m, args, resolve(newScope, expt), resolve(newScope, xs)),

    Expr.Lambda(meta, args, body, bound, docs) =>
      Expr.Lambda(meta,
                  args,
                  resolve(scope +++ unpack(args) +++ collect(body), body),
                  bound,
                  docs),

    Expr.Vector(meta, xs) =>
      Expr.Vector(meta, resolve(scope, xs)),

    Expr.Record(meta, xss) =>
      Expr.Record(meta, resolve(scope, xss)),

    Expr.Let(meta, name, value) =>
      Expr.Let(meta, name, resolve(scope, value)),

    Expr.Bind(meta, target, sel) =>
      Expr.Bind(meta, resolve(scope, target), sel),

    Expr.Apply(meta, sel, target, args) =>
      Expr.Apply(meta, sel, resolve(scope, target), resolve(scope, args)),

    Expr.Clone(meta, source, bindings) =>
      Expr.Clone(meta, resolve(scope, source), resolve(scope, bindings)),

    Expr.Extend(meta, source, bindings) =>
      Expr.Extend(meta, resolve(scope, source), resolve(scope, bindings)),

    Expr.Use(meta, traits, exprs) =>
      Expr.Use(meta, resolve(scope, traits), resolve(scope, exprs)),

    Expr.Using(meta, traits) =>
      Expr.Using(meta, resolve(scope, traits)),

    Expr.Do(meta, actions) =>
      Expr.Do(meta, propagate(scope, actions)),

    n @ Array => n.map(λ[resolve(scope, #)]),
    n => n
  }
}

module.exports = resolve;
