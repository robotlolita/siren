// # module: mermaid.codegen
//
// Generates code from the AST (in the future we might do some IR
// optimisations, but for now the semantics almost map 1:1 to JS, so it doesn't
// really matter much).

// -- Dependencies -----------------------------------------------------
var js = require('./jsast');
var nonLocalReturns = require('./returns');
var { DoClause:Do, Expr } = require('../ast');
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

function safeId(a) {
  return a.replace(/(\W)/g, function(_, a){
    return '$' + a.charCodeAt(0) + '_';
  });
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

function fexpr(meta, args, expr) {
  return fn(meta, null, args, [js.Return(expr.meta, expr)])
}

function boundFn(meta, id, args, body) {
  return methCall(meta, fn({}, id, args, body), str('bind'), [js.This({})])
}

function binding(meta, a, b) {
  return methCall(meta, a, str('bind'), [b])
}

function set(meta, id, expr) {
  return js.Assignment(meta, '=', id, expr)
}

function send(meta, obj, sel, args) {
  return methCall(meta,
                  obj,
                  id('$send'),
                  [sel, id('$methods'), js.ArrayExpr({}, args)]);
}

function letb(meta, name, expr) {
  return js.VarDecl(meta,
                    [js.VarDeclarator({}, name, expr)],
                    "var")
}

function declVars(meta, bindings) {
  return js.VarDecl(meta,
                    Object.keys(bindings).map(function(k) {
                      return js.VarDeclarator({}, id(k), bindings[k])
                    }),
                    "var")
}

function mem(meta, target, selector) {
  if (selector instanceof js.Id) selector = idToStr(selector);
  return js.Member(meta, target, selector, true)
}

function dot(meta, names) {
  return names.map(id).reduce(function(a, b){
    return mem(meta, a, b)
  })
}

function selector(meta, name) {
  if (name instanceof js.Id)  name = idToStr(name);
  return name;
}

function cloneMethods(meta, parent) {
  parent = parent || dot({}, ['Mermaid', '$methods']);
  return [
    letb(meta, id('$send'), dot({}, ['Mermaid', '$send'])),
    letb(meta, id('$methods'), methCall({}, parent, str('clone'), []))
  ]
}

function unpackGlobals(meta) {
  return declVars(meta, {
    'Module'   : methCall({}, id('Mermaid'), str('$module:'),
                          [id('require'), id('__dirname'), id('module')])
  })
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

function findDecoratedLambda(node) {
  return match node {
    Expr.Apply(_, _, _, [n]) =>
      findDecoratedLambda(n),

    n @ Expr.Lambda => n
  }
}

function generateProperty(bind, pair) {
  var _id = pair[0];
  var _fn = pair[1];
  var _l  = findDecoratedLambda(_fn);
  return js.Property(
    pair[0].meta,
    idToStr(generate(bind, _id)),
    methCall(_fn.meta,
             id('Mermaid'),
             str('$fn'),
             [
               generate(bind, _fn),
               js.Obj({},
                      [
                        js.Property({}, str('name'), str(_id.name), "init"),
                        js.Property({}, str('documentation'), str(_l.meta.docs || ''), "init"),
                        js.Property({}, str('arguments'),
                                    js.ArrayExpr({}, _l.args.map(λ[str(#.name)])), "init")
                      ])
             ]),
    "init"
  )
}

function generateBind(bind, meta, target, selector) {
  var ref = bind.free('$ref');
  return js.Call(meta,
                 fexpr(meta,
                       [js.Id(meta, ref)],
                       methCall(meta,
                                mem(meta, js.Id(meta, ref), generate(bind, selector)),
                                str('bind'),
                                [js.Id(meta, ref)])),
                 [generate(bind, target)])
}

function makeLambda(bind, meta, args, body) {
  var compiledBody = js.Block(meta, returnLast(generate(bind, body).map(toStatement)));
  if (nonLocalReturns.has(body)) {
    compiledBody = nonLocalReturns.wrap(compiledBody);
  }

  var fn = js.FnExpr(meta, null, generate(bind, args), [], null, compiledBody, false);

  return fn
}

function makeBlock(bind, meta, args, body) {
  var fn = js.FnExpr(meta, null, generate(bind, args),
                     [], null,
                     js.Block({}, returnLast(generate(bind, body).map(toStatement))),
                     false);

  return js.Call(meta,
                 js.Member(meta, fn, js.Str(meta, 'bind'), true),
                 [js.This(meta)]);
}

function generateModule(bind, meta, args, exports, body) {
  return set(meta, mem({}, id('module'), id('exports')),
             fn({}, null, generate(bind, args),
                [js.ExprStmt({}, str('use strict'))]
                +++ cloneMethods({}) +++ unpackGlobals({})
                +++ generate(bind, body)
                +++ (exports? [js.Return({}, generate(bind, exports))] : [])))
}

function generateApply(bind, apExpr) {
  var [holes, expr] = replaceHoles(bind, apExpr);

  var call = send(expr.meta,
                  generate(bind, expr.target),
                  selector(expr.meta, generate(bind, expr.selector)),
                  generate(bind, expr.args));

  if (holes.length > 0) {
    return boundFn(expr.meta, null, generate(bind, holes), [js.Return({}, call)]);
  } else {
    return call;
  }
}

function last(xs) {
  return xs[xs.length - 1];
}

function generateDo(bind, meta, xs) {
  return compile(collapseReturns(xs));

  function collapseReturns {
    [] => [],

    [n @ Do.Return] =>
      [Do.MultiReturn([n])],

    [n @ Do.MultiReturn] =>
      [n],

    [n @ Do.Action, ...ys] =>
      [n] +++ collapseReturns(ys),

    [n @ Do.Return, m @ Do.Action, ...ys] =>
      [Do.MultiReturn([n]), m] +++ collapseReturns(ys),

    [n @ Do.MultiReturn, m @ Do.Action, ...ys] =>
      [n, m] +++ collapseReturns(ys),

    [n @ Do.Return, m @ Do.Return, ...ys] =>
      collapseReturns([Do.MultiReturn([n, m])] +++ ys),

    [Do.MultiReturn(xs), n @ Do.Return, ...ys] =>
      collapseReturns([Do.MultiReturn(xs +++ [n])] +++ ys),

    n => raise(new Error("No match: " + show(n)))
  }

  function compile {
    [Do.Action(m, _, e)] => generate(bind, e),
    [Do.MultiReturn(xs)] =>
      compileMulti([[xs[0].binding, generate(bind, xs[0].expr)]] +++ xs.slice(1)),

    [Do.Action(m, i, e), Do.MultiReturn(es)] =>
      compileMulti([[i, generate(bind, e)]] +++ es),

    [Do.Action(m, i, e), Do.MultiReturn(es), ...ys] =>
      chain(m,
            compileMulti([
              [i, generate(bind, e)]
            ] +++ es),
            generate(bind, last(es).binding),
            compile(ys)),

    [Do.Action(m, i, e), ...ys] =>
      chain(m, generate(bind, e), generate(bind, i), compile(ys)),


    [Do.MultiReturn(xs), n @ Do.Action(m, i, e), ...ys] =>
      chain(last(xs).meta,
            compileMulti([[xs[0].binding, generate(bind, xs[0].expr)]] +++ xs.slice(1)),
            generate(bind, last(xs).binding),
            compile([n] +++ ys)),

    n => raise(new Error("No match: " + show(n)))
  };

  function compileMulti {
    [[i, r], Do.Return(m, i2, e), ...ys] =>
      compileMulti([[i2, map(m, r, generate(bind, i), generate(bind, e))]] +++ ys),

    [[i, r]] => r,

    n => raise(new Error("No match: " + show(n)))
  }

  function map(m, r, i, e) {
    return send(m, r, selector({}, str('map:')),
                [binding({}, fexpr(e.meta, [i], e), js.This({}))])
  }

  function chain(m, r, i, e) {
    return send(m, r, selector({}, str('chain:')),
                [binding({}, fexpr(e.meta, [i], e), js.This({}))])
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
      var repArgs = [], offset = 0;
      if (target.isHole) {
        var id = Expr.Id(target.meta, bind.free('$_'));
        repArgs = [id];
        target = id;
        offset = 1;
      }

      repArgs = repArgs +++ args.filter(λ[#.isHole]).map(λ[Expr.Id(#.meta, bind.free('$_'))]);
      var apArgs   = args.reduce(function(r, x) {
        return x.isHole?  { n: r.n + 1, args: r.args +++ [repArgs[r.n + offset]] }
        :      /* _ */    { n: r.n,     args: r.args +++ [x] }
      }, { n: 0, args: [] });

      var [targs, texpr] = replaceHoles(bind, target);
      var newArgs = apArgs.args.map(λ[replaceHoles(bind, #)]);
      var newArgsHoles = flatten(newArgs.map(λ[#[0]]));
      var newArgsExprs = newArgs.map(λ[#[1]]);


      return [targs +++ repArgs +++ newArgsHoles,
              Expr.Apply(meta, selector, texpr, newArgsExprs)];

    default:
      return [[], x]
  }
}

function generatePlainRecord(bind, x) {
  return match x {
    Expr.Record(meta, xs) =>
      js.Obj(meta, xs.map(λ[generateProperty(bind, #)])),

    n => raise(new Error("No match: " + show(n)))
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
    Expr.Lambda(meta, args, body) =>
      makeLambda(bind, meta, args, body),

    Expr.Block(meta, args, body) =>
      makeBlock(bind, meta, args, body),

    Expr.Num(meta, val) =>
      js.Num(meta, val),

    Expr.Str(meta, val) =>
      js.Str(meta, val),

    Expr.Bool(meta, val) =>
      js.Bool(meta, val),

    Expr.Vector(meta, xs) =>
      js.ArrayExpr(meta, generate(bind, xs)),

    Expr.Record(meta, xs) =>
      methCall(meta,
               id('Mermaid'),
               str('$make'),
               [generatePlainRecord(bind, Expr.Record(meta, xs))]),

    Expr.Let(meta, Expr.Id(_, name), value) =>
      letb(meta, id(safeId(name)), generate(bind, value)),

    Expr.Bind(meta, target, sel) =>
      generateBind(bind, meta, target, sel),

    n @ Expr.Apply(meta, sel, target, args) =>
      generateApply(bind, n),

    Expr.Clone(meta, source, bindings) =>
      send(meta,
           generate(bind, source),
           selector({}, str('clone:')),
           [generatePlainRecord(bind, bindings)]),

    Expr.Extend(meta, source, bindings) =>
      methCall(meta, id('Mermaid'), str('$extend'),
               [generate(bind, source), generatePlainRecord(bind, bindings)]),

    Expr.Return(meta, expr) =>
      methCall(meta, id('Mermaid'), str('$return'), [generate(bind, expr)]),

    Expr.Use(meta, traits, xs) =>
      js.Call(meta,
              fn({}, null, [id('$methods')],
                 [methCall(meta, id('$methods'), str('merge'), generate(bind, traits))]
                 +++ generate(bind, xs)),
              [methCall({}, id('$methods'), str('clone'), [])]),

    Expr.Using(meta, traits) =>
      methCall(meta, id('$methods'), str('merge'), generate(bind, traits)),

    Expr.Var(meta, Expr.Id(_, sel)) =>
      js.Id(meta, safeId(sel)),

    Expr.Global(meta, Expr.Id(_, sel)) =>
      send(meta, id('Mermaid'), selector({}, str(sel)), []),

    Expr.Do(meta, xs) =>
      generateDo(bind, meta, xs),

    Expr.Program(xs) =>
      js.ExprStmt({},
                  js.Call({},
                          fn({}, null, [],
                             [js.ExprStmt({}, str('use strict'))]
                             +++ cloneMethods({})
                             +++ unpackGlobals({})
                             +++ returnLast(generate(bind, xs).map(toStatement))),
                          [])),

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
