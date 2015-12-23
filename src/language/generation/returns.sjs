// # module: siren.generation.returns
//
// Handles non-local returns.

// -- Dependencies -----------------------------------------------------
var { DoClause:Do, Expr } = require('../ast');
var js = require('./jsast');


// -- Helpers ----------------------------------------------------------
function hasNonLocalReturn(node) {
  return match node {
    Expr.Seq(_, body) =>
      hasNonLocalReturn(body),

    Expr.Block(_, _, body) =>
      hasNonLocalReturn(body),

    Expr.Vector(_, exprs) =>
      hasNonLocalReturn(exprs),

    Expr.Let(_, _, expr) =>
      hasNonLocalReturn(expr),

    Expr.Apply(_, _, expr, args) =>
      hasNonLocalReturn(expr) || hasNonLocalReturn(args),

    Expr.Clone(_, source, _) =>
      hasNonLocalReturn(source),

    Expr.Use(_, traits, exprs) =>
      hasNonLocalReturn(traits) || hasNonLocalReturn(exprs),

    Expr.Using(_, traits) =>
      hasNonLocalReturn(traits),

    Expr.Do(_, actions) =>
      hasNonLocalReturn(actions),

    Do.Action(_, _, expr) =>
      hasNonLocalReturn(expr),

    Do.Return(_, _, expr) =>
      hasNonLocalReturn(expr),

    Do.MultiReturn(exprs) =>
      hasNonLocalReturn(exprs),

    Expr.Return =>
      true,

    xs @ Array => xs.some(hasNonLocalReturn),
    n => false
  }
}

function wrapBody(body) {
  return js.Block(
    {},
    [
      js.Try(
        {},
        body,
        js.CatchClause(
          js.Id({}, '$result'),
          js.Block(
            {},
            [
              js.Return(
                {},
                js.Call(
                  {},
                  js.Member({}, js.Id({}, '$Siren'), js.Str({}, '$handleReturn'), true),
                  [js.Id({}, '$result')]
                )
              )
            ]
          )
        ),
        null
      )
    ]
  )
}

module.exports = {
  wrap: wrapBody,
  has: hasNonLocalReturn
};
