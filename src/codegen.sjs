// # module: mermaid.codegen
//
// Generates code from the AST (in the future we might do some IR
// optimisations, but for now the semantics almost map 1:1 to JS, so it doesn't
// really matter much).

// -- Dependencies -----------------------------------------------------
var js = require('./jsast');
var { Expr } = require('./ast');

function toStatement(x) {
  return x instanceof js.Statement?                      x
  :      x && x.hasParent && x.hasParent(js.Statement)?  x
  :      /* otherwise */                                 js.ExprStmt(x.meta, x)
}

function returnLast(ys) {
  if (!ys.length)  return ys;

  var xs = ys.slice(0, -1);
  var stmt = ys[ys.length - 1];
  if (stmt instanceof js.ExprStmt) {
    xs.push(js.Return(stmt.meta, stmt.expr));
    return xs
  } else {
    return ys
  }
}

function methCall(meta, target, selector, args) {
  return js.Call(meta,
                 js.Member(meta,
                           target,
                           selector,
                           true),
                 args)
}

function idToStr {
  js.Id(meta, x) => js.Str(meta, x)
}

function generateProperty(bind, pair) {
  return js.Property(
    pair[0].meta,
    generate(bind, pair[0]),
    generate(bind, pair[1]),
    "init"
  )
}

function generateBind(bind, meta, target, selector) {
  var ref = bind.free('$ref');
  return js.Call(meta,
                 js.FnExpr(meta,
                           null,
                           [js.Id(meta, ref)],
                           [], null,
                           js.Block(
                             meta,
                             [js.Return(meta,
                                        methCall(meta,
                                                 js.Member(meta,
                                                           js.Id(meta, ref),
                                                           idToStr(generate(bind, selector)),
                                                           true),
                                                 js.Str(meta, 'bind'),
                                                 [js.Id(meta, ref)]))
                             ]),
                           false),
                           [generate(bind, target)])
}

function BindingBox() {
  this.bindings = {};
}
BindingBox::free = function(name) {
  var suffix = this.bindings[name] || 0;
  this.bindings[name] = suffix + 1;
  return name + suffix;  
}


function generate(bind, x) {
  return match x {
    Expr.Empty =>
      js.Empty({}),
  
    Expr.Comment(meta, comment) =>
      js.Empty(meta), // Doesn't look like Mozilla supports comments
  
    Expr.Id(meta, name) =>
      js.Id(meta, name),
  
    Expr.Self(meta) =>
      js.This(meta),
  
    // Values
    Expr.Lambda(meta, args, body) =>
      js.FnExpr(meta,
                null,
                generate(bind, args),
                [], null,
                js.Block(meta,
                         returnLast(generate(bind, body).map(toStatement))),
                false),
  
    Expr.Num(meta, val) =>
      js.Num(meta, val),
  
    Expr.Str(meta, val) =>
      js.Str(meta, val),
  
    Expr.Vector(meta, xs) =>
      js.ArrayExpr(meta, generate(bind, xs)),
  
    Expr.Record(meta, xs) =>
      js.Obj(meta, xs.map(λ[generateProperty(bind, #)])),
  
    Expr.Let(meta, name, value) =>
      js.VarDecl(meta,
                 [js.VarDeclarator(meta,
                                   generate(bind, name),
                                   generate(bind, value))],
                 "var"),
  
    Expr.Bind(meta, target, selector) =>
      generateBind(bind, meta, target, selector),
    
    Expr.Apply(meta, selector, target, args) =>
      js.Call(meta,
              js.Member(meta,
                        generate(bind, target),
                        idToStr(generate(bind, selector)),
                        true),
              generate(bind, args)),

    Expr.Clone(meta, source, bindings) =>
      js.Call(meta,
              js.Member(meta,
                        generate(bind, source),
                        js.Str(meta, 'clone'),
                        true),
              [generate(bind, bindings)]),

    Expr.Extend(meta, source, bindings) =>
      (function(){ throw new Error('Not supported yet.') })(),

    Expr.Var(meta, Expr.Id(_, selector)) =>
      js.Id(meta, selector),

    Expr.Program(xs) =>
      js.Prog({}, generate(bind, xs).map(toStatement)),

    x @ Array => x.map(λ[generate(bind, #)])
  }
}

module.exports = {
  generate: generate,
  BindingBox: BindingBox
}
