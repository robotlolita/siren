// # module: siren.generation.resolve-bindings
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
    n => []
  }
}

function unpack(ids) {
  return ids.map(λ[#.name])
}

function propagate(scope, nodes) {
  return match nodes {
    [a @ Do.Action(_, Expr.Id(_, name), _), ...xs] =>
      [resolve(scope, a)] +++ propagate(scope +++ [name], xs),

    [a @ Do.Return(_, Expr.Id(_, name), _), ...xs] =>
      [resolve(scope, a)] +++ propagate(scope +++ [name], xs),

    [] => []
  }
}

// -- Transformation ---------------------------------------------------
function resolve(scope, node) {
  return match node {
    Expr.Free(m1, Expr.Id(m2, name)) =>
      contains(scope, name)?  Expr.Var(m1, Expr.Id(m2, name))
      : /* otherwise */       Expr.Global(m1, Expr.Id(m2, name)),

    Expr.Module(m, args, expt, xs) =>
      (scope +++ ['Module'] +++ unpack(args) +++ collect(xs))
      |> λ(newScope) ->
           Expr.Module(m, args, resolve(newScope, expt), resolve(newScope, xs)),

    Expr.Seq(m, body) =>
      Expr.Seq(m, resolve(scope, body)),

    Expr.Lambda(meta, Expr.Id(mself, self), args, body) =>
      Expr.Lambda(meta,
                  Expr.Id(mself, self),
                  args,
                  resolve(scope +++ [self] +++ unpack(args) +++ collect(body), body)),

    Expr.Block(meta, args, body) =>
      Expr.Block(meta,
                 args,
                 resolve(scope +++ unpack(args) +++ collect(body), body)),

    Expr.Vector(meta, xs) =>
      Expr.Vector(meta, resolve(scope, xs)),

    Expr.Record(meta, xss) =>
      Expr.Record(meta, resolve(scope, xss)),

    Expr.Let(meta, name, value) =>
      Expr.Let(meta, name, resolve(scope, value)),

    Expr.Apply(meta, sel, target, args) =>
      Expr.Apply(meta, sel, resolve(scope, target), resolve(scope, args)),

    Expr.Clone(meta, source, bindings) =>
      Expr.Clone(meta, resolve(scope, source), resolve(scope, bindings)),

    Expr.Extend(meta, source, bindings) =>
      Expr.Extend(meta, resolve(scope, source), resolve(scope, bindings)),

    Expr.Return(meta, expr) =>
      Expr.Return(meta, resolve(scope, expr)),

    Expr.Use(meta, traits, exprs) =>
      Expr.Use(meta, resolve(scope, traits), resolve(scope, exprs)),

    Expr.Using(meta, traits) =>
      Expr.Using(meta, resolve(scope, traits)),

    Expr.Do(meta, actions) =>
      Expr.Do(meta, propagate(scope, actions)),

    Do.Action(meta, binding, expr) =>
      Do.Action(meta, binding, resolve(scope, expr)),

    Do.Return(meta, binding, expr) =>
      Do.Return(meta, binding, resolve(scope, expr)),

    n @ Array => n.map(λ[resolve(scope, #)]),
    n => n
  }
}

module.exports = resolve;
