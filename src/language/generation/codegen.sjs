// # module: siren.codegen
//
// Generates code from the AST (in the future we might do some IR
// optimisations, but for now the semantics almost map 1:1 to JS, so it doesn't
// really matter much).

// -- Dependencies -----------------------------------------------------
var js = require('./jsast');
var S = require('./gensiren');
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
  return '_' + a.replace(/(\W)/g, function(_, a){
    return a === '-'? '_' : '$' + a.charCodeAt(0) + '_';
  });
}

function toSafeId {
  Expr.Id(meta, name) => Expr.Id(meta, safeId(name));
}

function safeArgs(bind, args) {
  return args.map(function(a) {
    return a.name === '_'?  Expr.Id(a.meta, bind.free('_'))
    :      /* _ */          toSafeId(a)
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

function fn(meta, ident, args, body) {
  return js.FnExpr(meta, ident, args, [], null, js.Block({}, body.map(toStatement)), false)
}

function fexpr(meta, args, expr) {
  return fn(meta, null, args, [js.Return(expr.meta, expr)])
}

function set(meta, id, expr) {
  return js.Assignment(meta, '=', id, expr)
}

function send(meta, obj, sel, args) {
  switch (args.length) {
    case 0:
    return methCall(meta, obj, id('send0'), [id('_Context'), sel]);

    case 1:
    return methCall(meta, obj, id('send1'), [id('_Context'), sel, args[0]]);

    case 2:
    return methCall(meta, obj, id('send2'), [id('_Context'), sel, args[0], args[1]]);

    case 3:
    return methCall(meta, obj, id('send3'), [id('_Context'), sel, args[0], args[1], args[2]]);

    default:
    return methCall(meta, obj, id('sendN'), [id('_Context'), sel, js.ArrayExpr({}, args)])
  }
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
  parent = parent || S.globalContext({});
  return [
    letb(meta, id('_Module'), S.makeModule({})),
    letb(meta, id('_Context'), dot({}, ['_Module', 'context']))
  ]
}

function id(str) {
  return js.Id({}, str)
}

function str(a) {
  return js.Str({}, a)
}

function methCall(meta, target, selector, args) {
  return js.Call(meta,
                 js.Member(meta, target, selector, false),
                 args)
}

function idToStr {
  js.Id(meta, x) => js.Str(meta, x),
  a              => raise(new TypeError("No match: " + show(a)))
}

function wrapDecoratedLambda(node, fn) {
  return match node {
    Expr.Apply(a, b, c, [n]) =>
      Expr.Apply(a, b, c, [wrapDecoratedLambda(n, fn)]),

    n @ Expr.Lambda => fn(n)
  }
}

function generateProperty(bind, pair) {
  var _id = pair[0];
  var _fn = pair[1];
  return js.Property(
    pair[0].meta,
    idToStr(generate(bind, _id)),
    generate(bind, wrapDecoratedLambda(_fn, function(node) {
      return Expr.Raw(S.makeFunction(
        _fn.meta,
        generate(bind, node),
        {
          name: _id.name,
          docs: node.meta.docs || '',
          args: [node.self.name] +++ node.args.map(λ[#.name]),
          source: node.source,
          start: node.start,
          end: node.end
        }
      ))
    })),
    "init"
  )
}

function makeLambda(bind, meta, self, args, body) {
  var compiledBody = js.Block(meta, returnLast(generate(bind, body).map(toStatement)));
  if (nonLocalReturns.has(body)) {
    compiledBody = nonLocalReturns.wrap(compiledBody);
  }

  var fn = js.FnExpr(meta, null, generate(bind, safeArgs(bind, [self] +++ args)), [], null, compiledBody, false);

  return fn
}

function makeBlock(bind, meta, args, body) {
  return S.makeBlock(
    meta,
    js.FnExpr(
      meta,
      null,
      generate(bind, safeArgs(bind, args)),
      [],
      null,
      js.Block({}, returnLast(generate(bind, body).map(toStatement))),
      false
    ),
    {
      name: '(anonymous block' + (args.length? ': ' + args.map(λ[#.name]).join(', ') : '') + ')',
      args: args.map(λ[#.name]),
      source: meta.source,
      start: meta.start,
      end: meta.end
    }
  )
}

function generateModule(bind, meta, args, exports, body) {
  var hasExports = exports.value.length > 0;
  if (hasExports) {
    var returnValue = [
      js.Return({}, S.makeObject({}, generatePlainRecord(bind, exports), id('_Module')))
    ];
  } else {
    var returnValue = [js.Return({}, id('_Module'))];
  }

  return set(meta, mem({}, id('module'), id('exports')),
             fn({}, null, generate(bind, [Expr.Id(meta, '$Siren')] +++ safeArgs(bind, args)),
                [js.ExprStmt({}, str('use strict'))]
                +++ cloneMethods({})
                +++ generate(bind, body)
                +++ returnValue));
}

function generateApply(bind, apExpr) {
  var [holes, expr] = replaceHoles(bind, apExpr);

  var call = send(expr.meta,
                  generate(bind, expr.target),
                  selector(expr.meta, generate(bind, expr.selector)),
                  generate(bind, expr.args));

  if (holes.length > 0) {
    return S.makeBlock(
      expr.meta,
      fn(expr.meta, null, generate(bind, holes), [js.Return({}, call)]),
      {
        name: '(partial application: ' + expr.meta.source + ')',
        args: [],
        source: expr.meta.source,
        start: expr.meta.start,
        end: expr.meta.end
      }
    );
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
            generate(bind, toSafeId(last(es).binding)),
            compile(ys)),

    [Do.Action(m, i, e), ...ys] =>
      chain(m, generate(bind, e), generate(bind, toSafeId(i)), compile(ys)),


    [Do.MultiReturn(xs), n @ Do.Action(m, i, e), ...ys] =>
      chain(last(xs).meta,
            compileMulti([[xs[0].binding, generate(bind, xs[0].expr)]] +++ xs.slice(1)),
            generate(bind, toSafeId(last(xs).binding)),
            compile([n] +++ ys)),

    n => raise(new Error("No match: " + show(n)))
  };

  function compileMulti {
    [[i, r], Do.Return(m, i2, e), ...ys] =>
      compileMulti([[i2, map(m, r, generate(bind, toSafeId(i)), generate(bind, e))]] +++ ys),

    [[i, r]] => r,

    n => raise(new Error("No match: " + show(n)))
  }

  function map(m, r, i, e) {
    return send(m, r, selector({}, str('map:')),
                [S.makeBlock(
                  e.meta,
                  fexpr(e.meta, [i], e),
                  {
                    name: '(Do map: ' + i.name + ')',
                    args: [i.name],
                    source: e.meta.source,
                    start: e.meta.start,
                    end: e.meta.end
                  }
                )])
  }

  function chain(m, r, i, e) {
    return send(m, r, selector({}, str('chain:')),
                [S.makeBlock(
                  e.meta,
                  fexpr(e.meta, [i], e),
                  {
                    name: '(Do map: ' + i.name + ')',
                    args: [i.name],
                    source: e.meta.source,
                    start: e.meta.start,
                    end: e.meta.end
                  }
                )])
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


      return [repArgs, Expr.Apply(meta, selector, target, apArgs.args)]

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

    Expr.GlobalObject(meta) =>
      S.global(meta),

    Expr.Comment(meta, comment) =>
      js.Empty(meta), // Doesn't look like Mozilla supports comments

    Expr.Id(meta, name) =>
      js.Id(meta, name),

    // Values
    Expr.Lambda(meta, self, args, body) =>
      makeLambda(bind, meta, self, args, body),

    Expr.Block(meta, args, body) =>
      makeBlock(bind, meta, args, body),

    Expr.Num(meta, val) =>
      S.float64(meta, val),

    Expr.Int(meta, sign, num) =>
      S.integer(meta, sign, num),

    Expr.Str(meta, val) =>
      S.text(meta, val),

    Expr.Vector(meta, xs) =>
      S.tuple(meta, generate(bind, xs)),

    Expr.Record(meta, xs) =>
      S.makeObject(meta, generatePlainRecord(bind, Expr.Record(meta, xs)), S.object({})),

    Expr.Let(meta, Expr.Id(_, name), value) =>
      letb(
        meta,
        id(safeId(name)),
        meta.literal?  S.withMeta({},
                                  generate(bind, value),
                                  { name: S.text({}, name) })
        :              generate(bind, value)
      ),

    n @ Expr.Apply(meta, sel, target, args) =>
      generateApply(bind, n),

    Expr.Clone(meta, source, bindings) =>
      send(meta,
           generate(bind, source),
           selector({}, str('refined-by:')),
           [S.makeObject({}, generatePlainRecord(bind, bindings), S.object({}))]),

    Expr.Return(meta, expr) =>
      methCall(meta, id('$Siren'), id('$return'), [generate(bind, expr)]),

    Expr.Use(meta, traits, xs) =>
      js.Call(meta,
              fn({}, null, [id('_Context')],
                 generate(bind, xs)),
              [send({}, id('_Context'), selector({}, str('with:')), [generate(bind, traits)])]),

    Expr.Using(meta, traits) =>
      letb(
        meta,
        id('_Context'),
        send({}, id('_Context'), selector({}, str('with:')), [generate(bind, traits)])
      ),

    Expr.Var(meta, Expr.Id(_, sel)) =>
      js.Id(meta, safeId(sel)),

    Expr.Global(meta, Expr.Id(_, sel)) =>
      send(meta, S.global({}), selector({}, str(sel)), []),

    Expr.Do(meta, xs) =>
      generateDo(bind, meta, xs),

    Expr.Module(meta, args, exports, body) =>
      generateModule(bind, meta, args, exports, body),

    Expr.Seq(meta, body) =>
      js.Prog(meta, generate(bind, body).map(toStatement)),

    Expr.Raw(tree) =>
      tree,

    x @ Array => x.map(λ[generate(bind, #)]),

    a => raise(new TypeError("No match: " + show(a)))
  }
}

module.exports = {
  generate: generate,
  BindingBox: BindingBox
}
