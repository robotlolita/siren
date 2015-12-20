// # module: siren.codegen.gensiren
//
// Generates specific Siren values.

var js = require('./jsast');
var { Expr } = require('../ast');


// -- Helpers ----------------------------------------------------------
function rtCall(meta, name, args) {
  return js.Call(
    meta,
    js.Member({}, rt(), js.Id({}, name), false),
    args
  )
}

function rtMember(meta, name) {
  return js.Member({}, rt(), js.Id({}, name), false);
}

function maybeProp(k, v) {
  if (v) {
    return [js.Property({}, js.Str({}, k), v, 'init')];
  } else {
    return [];
  }
}

function fnMeta(meta) {
  return ([
    js.Property({}, js.Str({}, 'name'), text({}, meta.name), 'init'),
    js.Property({}, js.Str({}, 'documentation'), text({}, meta.docs || ''), 'init'),
    js.Property({}, js.Str({}, 'arguments'), tuple({}, meta.args.map(λ[text({}, #)])), 'init'),
  ] +++ maybeProp('source', meta.source? text({}, meta.source) : undefined)
    +++ maybeProp('line', meta.line != null? integer({}, '+', String(meta.line)) : undefined)
    +++ maybeProp('column', meta.column != null? integer({}, '+', String(meta.column)) : undefined)
    +++ maybeProp('start-offset', meta.span? integer({}, '+', String(meta.span[0])) : undefined)
    +++ maybeProp('end-offset', meta.span? integer({}, '+', String(meta.span[1])) : undefined))
}

function genObject(meta) {
  return js.Obj(
    {},
    Object.keys(meta).map(function(key) {
      return js.Property({}, js.Str({}, key), meta[key], 'init');
    })
  );
}


// -- Public interface -------------------------------------------------
exports.rt = rt;
function rt(m) {
  return js.Id(m || {}, '$Siren');
}

exports.integer = integer;
function integer(m, s, n) {
  return s === '-'?   rtCall(m, '$negint', [js.Str({}, n)])
  :      /* _ */      rtCall(m, '$int', [js.Str({}, n)]);
}

exports.float64 = float64;
function float64(m, n) {
  return n < 0?   rtCall(m, '$float', [js.Unary({}, '-', true, js.Num({}, n))])
  :      /* _ */  rtCall(m, '$float', [js.Num({}, n)]);
}

exports.text = text;
function text(m, s) {
  return rtCall(m, '$text', [js.Str({}, s)]);
}

exports.tuple = tuple;
function tuple(m, v) {
  return rtCall(m, '$tuple', [js.ArrayExpr(m, v)]);
}

exports.global = global;
function global(m) {
  return rtMember(m, '$global');
}

exports.object = object;
function object(m) {
  return rtMember(m, '$object');
}

exports.globalContext = globalContext;
function globalContext(m) {
  return rtMember(m, '$context');
}

exports.makeModule = makeModule;
function makeModule(m) {
  return rtCall(m, '$makeModule',
               [js.Id({}, 'module'), js.Id({}, 'require'), js.Id({}, '$Siren')]);
}

exports.makeFunction = makeFunction;
function makeFunction(m, fn, meta) {
  return rtCall(m, '$makeFunction', [
    fn,
    js.Obj({}, fnMeta(meta))
  ]);
}

exports.makeBlock = makeBlock;
function makeBlock(m, fn, meta) {
  return rtCall(m, '$makeBlock', [
    fn,
    js.Obj(
      {},
      fnMeta(meta)
    )
  ]);
}

exports.makeObject = makeObject;
function makeObject(m, o, p) {
  return rtCall(m, '$makeObject', [o, p]);
}

exports.withMeta = withMeta;
function withMeta(m, o, meta) {
  return rtCall(m, '$withMeta', [o, genObject(meta)]);
}
