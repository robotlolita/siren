// # module: mermaid.codegen
//
// Generates code from the AST (in the future we might do some IR
// optimisations, but for now the semantics almost map 1:1 to JS, so it doesn't
// really matter much).

// -- Dependencies -----------------------------------------------------
var js = require('./jsast');
var { Expr } = require('./ast');
var show = require('core.inspect');

function raise(e) {
  throw e
}

function flatten(xs) {
  return xs.reduce(λ[# +++ #], []);
}

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

function fn(meta, id, args, body) {
  return js.FnExpr(meta, id, args, [], null, js.Block({}, body.map(toStatement)), false)
}

function boundFn(meta, id, args, body) {
  return methCall(meta, fn({}, id, args, body), str('bind'), [js.This({})])
}

function set(meta, id, expr) {
  return js.Assignment(meta, '=', id, expr)
}

function letb(meta, name, expr) {
  return js.VarDecl(meta,
                    [js.VarDeclarator({}, name, expr)],
                    "var")
}

function mem(meta, target, selector) {
  if (selector instanceof js.Id) selector = idToStr(selector);
  return js.Member(meta, target, selector, true)
}

function id(str) {
  return js.Id({}, str)
}

function str(a) {
  return js.Str({}, a)
}

function methCall(meta, target, selector, args) {
  return js.Call(meta,
                 js.Member(meta, target, selector, true),
                 args)
}

function idToStr {
  js.Id(meta, x) => js.Str(meta, x),
  a              => raise(new TypeError("No match: " + show(a)))
}

function generateProperty(bind, pair) {
  return js.Property(
    pair[0].meta,
    idToStr(generate(bind, pair[0])),
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

function makeLambda(bind, meta, args, body, bound) {
  var fn = js.FnExpr(meta,
                     null,
                     generate(bind, args),
                     [], null,
                     js.Block(meta,
                              returnLast(generate(bind, body).map(toStatement))),
                     false);

  if (bound) {
    return js.Call(meta,
                   js.Member(meta, fn, js.Str(meta, 'bind'), true),
                   [js.This(meta)])
  } else {
    return fn
  }
}

function generateModule(bind, meta, args, exports, body) {
  return set(meta, mem({}, id('module'), id('exports')),
             fn({}, null, generate(bind, args),
                [
                  letb({}, id('Module'),
                       methCall({}, id('$Mermaid'), str('$module:'),
                                [id('require'), id('__dirname'), id('module')]))
                ].map(toStatement)
                +++ generate(bind, body)
                +++ (exports? [js.Return({}, generate(bind, exports))] : [])))
}

function generateApply(bind, apExpr) {
  var [holes, expr] = replaceHoles(bind, apExpr);
  
  var call = methCall(expr.meta,
                      generate(bind, expr.target),
                      idToStr(generate(bind, expr.selector)),
                      generate(bind, expr.args));
  
  if (holes.length > 0) {
    return boundFn(expr.meta, null, generate(bind, holes), [js.Return({}, call)]);
  } else {
    return call;
  }
}

function BindingBox() {
  this.bindings = {};
}
BindingBox::free = function(name) {
  var suffix = this.bindings[name] || 0;
  this.bindings[name] = suffix + 1;
  return name + (suffix || '');
}

function replaceHoles(bind, x) {
  match x {
    case Expr.Apply(meta, selector, target, args):
      var repArgs = [];
      if (target.isHole) {
        var id = Expr.Id(target.meta, bind.free('$_'));
        repArgs = [id];
        target = id;
      }

      repArgs = repArgs +++ args.filter(λ[#.isHole]).map(λ[Expr.Id(#.meta, bind.free('$_'))]);
      var apArgs   = args.reduce(function(r, x) {
        return x.isHole?  { n: r.n + 1, args: r.args +++ [repArgs[r.n]] }
        :      /* _ */    { n: r.n,     args: r.args +++ [x] }
      }, { n: 0, args: [] });

      var [targs, texpr] = replaceHoles(bind, target);
      var newArgs = apArgs.args.map(λ[replaceHoles(bind, #)]);
      var newArgsHoles = flatten(newArgs.map(λ[#[0]]));
      var newArgsExprs = newArgs.map(λ[#[1]]);


      return [repArgs +++ targs +++ newArgsHoles,
              Expr.Apply(meta, selector, texpr, newArgsExprs)];

    default:
      return [[], x]
  }
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
    Expr.Lambda(meta, args, body, bound) =>
      makeLambda(bind, meta, args, body, bound),
  
    Expr.Num(meta, val) =>
      js.Num(meta, val),
  
    Expr.Str(meta, val) =>
      js.Str(meta, val),
  
    Expr.Vector(meta, xs) =>
      js.ArrayExpr(meta, generate(bind, xs)),
  
    Expr.Record(meta, xs) =>
      js.Obj(meta, xs.map(λ[generateProperty(bind, #)])),
  
    Expr.Let(meta, name, value) =>
      letb(meta, generate(bind, name), generate(bind, value)),
  
    Expr.Bind(meta, target, selector) =>
      generateBind(bind, meta, target, selector),
    
    n @ Expr.Apply(meta, selector, target, args) =>
      generateApply(bind, n),

    Expr.Clone(meta, source, bindings) =>
      js.Call(meta,
              js.Member(meta,
                        generate(bind, source),
                        js.Str(meta, 'clone:'),
                        true),
              [generate(bind, bindings)]),

    Expr.Extend(meta, source, bindings) =>
      raise(new Error("Not implemented.")),

    Expr.Var(meta, Expr.Id(_, selector)) =>
      js.Id(meta, selector),

    Expr.Program(xs) =>
      js.Prog({}, generate(bind, xs).map(toStatement)),

    Expr.Module(meta, args, exports, body) =>
      generateModule(bind, meta, args, exports, body),

    x @ Array => x.map(λ[generate(bind, #)]),

    a => raise(new TypeError("No match: " + show(a)))
  }
}

module.exports = {
  generate: generate,
  BindingBox: BindingBox
}
