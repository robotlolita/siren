// # module: mermaid.jsast
//
// Mozilla's Parser format as a sum type.

// -- Dependencies -----------------------------------------------------
var { Base } = require('adt-simple');
var c = require('core.check');
var { Success, Failure } = require('data.validation');
var extend = require('xtend');
var Maybe = require('data.maybe');

// -- Validations ------------------------------------------------------
function is(type) {
  return function(a) {
    return a instanceof type?                      Success(a)
    :      a && a.hasParent && a.hasParent(type)?  Success(a)
    :      /* otherwise */                         Failure(c.Violation.Tag(type.name, a))
  }
}

var checkPar = λ a b -> a === b || (b && b.hasParent && b.hasParent(a));

var a = λ f x -> c.assert(f(x));
var maybe = λ[c.Or([c.Null, #])];
var toObject = λ[#.toObject()];

function maybeObject(a) {
  return Maybe.fromNullable(a).map(λ[#.toObject()]).getOrElse(null)
}


var unaryOp = c.Or([
  c.Value('-'), c.Value('+'), c.Value('!'), c.Value('~'),
  c.Value('typeof'), c.Value('void'), c.Value('delete')
]);

var binaryOp = c.Or([
  c.Value('=='),
  c.Value('!='),
  c.Value('==='),
  c.Value('!=='),
  c.Value('<'),
  c.Value('<='),
  c.Value('>'),
  c.Value('>='),
  c.Value('<<'),
  c.Value('>>'),
  c.Value('>>>'),
  c.Value('+'),
  c.Value('-'),
  c.Value('*'),
  c.Value('/'),
  c.Value('%'),
  c.Value('|'),
  c.Value('^'),
  c.Value('&'),
  c.Value('in'),
  c.Value('instanceof')
]);

var logicalOp = c.Or([
  c.Value('||'), c.Value('&&')
]);

var assignmentOp = c.Or([
  c.Value('='),
  c.Value('+='),
  c.Value('-='),
  c.Value('*='),
  c.Value('/='),
  c.Value('%='),
  c.Value('<<='),
  c.Value('>>='),
  c.Value('>>>='),
  c.Value('|='),
  c.Value('^='),
  c.Value('&=')
]);

var updateOp = c.Or([
  c.Value('++'), c.Value('--')
]);
// -- Data structures --------------------------------------------------
union Node {
  Prog {
    meta: Object,
    body: λ[a(c.ArrayOf(is(Statement)))(#)]
  }
} deriving (Base)


union Statement {
  Empty { meta: Object },
  Block {
    meta: Object,
    body: λ[a(c.ArrayOf(is(Statement)))(#)]
  },
  ExprStmt {
    meta: Object,
    expr: λ[a(is(Expr))(#)]
  },
  If {
    meta: Object,
    test: λ[a(is(Expr))(#)],
    consequent: λ[a(is(Statement))(#)],
    alternate: λ[a(maybe(is(Statement)))(#)],
  },
  Label {
    meta: Object,
    label: λ[a(is(Id))(#)],
    body: λ[a(is(Statement))(#)]
  },
  Break {
    meta: Object,
    label: λ[a(maybe(is(Id)))(#)]
  },
  Continue {
    meta: Object,
    label: λ[a(maybe(is(Id)))(#)]
  },
  With {
    meta: Object,
    obj: λ[a(is(Expr))(#)],
    body: λ[a(is(Statement))(#)]
  },
  Switch {
    meta: Object,
    discriminant: λ[a(is(Expr))(#)],
    cases: λ[a(c.ArrayOf(is(SwitchCase)))(#)],
    lexical: a(c.Boolean)
  },
  Return {
    meta: Object,
    arg: λ[a(maybe(is(Expr)))(#)]
  },
  Throw {
    meta: Object,
    arg: λ[a(maybe(is(Expr)))(#)]
  },
  Try {
    meta: Object,
    block: λ[a(is(Block))(#)],
    handler: λ[a(maybe(is(CatchClause)))(#)],
    finalizer: λ[a(maybe(is(Block)))(#)]
  },
  While {
    meta: Object,
    test: λ[a(is(Expr))(#)],
    body: λ[a(is(Statement))(#)]
  },
  DoWhile {
    meta: Object,
    test: λ[a(is(Expr))(#)],
    body: λ[a(is(Statement))(#)]
  },
  For {
    meta   : Object,
    init   : λ[a(c.Or([is(VarDecl), is(Expr), c.Null]))(#)],
    test   : λ[a(maybe(is(Expr)))(#)],
    update : λ[a(maybe(is(Expr)))(#)],
    body   : λ[a(is(Statement))(#)]
  },
  ForIn {
    meta  : Object,
    left  : λ[a(c.Or([is(VarDecl), is(Expr)]))(#)],
    right : λ[a(is(Expr))(#)],
    body  : λ[a(is(Statement))(#)]
  },
  ForOf {
    meta  : Object,
    left  : λ[a(c.Or([is(VarDecl), is(Expr)]))(#)],
    right : λ[a(is(Expr))(#)],
    body  : λ[a(is(Statement))(#)]
  },
  Let {
    meta  : Object,
    head  : λ[a(c.ArrayOf(is(VarDeclarator)))(#)],
    body  : λ[a(is(Statement))(#)]
  },
  Debugger {
    meta  : Object
  }
} deriving (Base)
Statement::hasParent = λ(a) -> [Node].some(checkPar(a));


union Declaration {
  FnDecl {
    meta         : Object,
    id           : λ[a(is(Id))(#)],
    params       : λ[a(c.ArrayOf(is(Pattern)))(#)],
    defaults     : λ[a(c.ArrayOf(is(Expr)))(#)],
    rest         : λ[a(maybe(is(Id)))(#)],
    body         : λ[a(is(Block))(#)],
    generator    : λ[a(c.Boolean)(#)]
  },
  VarDecl {
    meta         : Object,
    declarations : λ[a(c.ArrayOf(is(VarDeclarator)))(#)],
    kind         : λ[a(c.Or([c.Value("var"), c.Value("let"), c.Value("const")]))(#)]
  },
  VarDeclarator {
    meta         : Object,
    id           : λ[a(is(Pattern))(#)],
    init         : λ[a(maybe(is(Expr)))(#)]
  }
} deriving (Base)
Declaration::hasParent = λ(a) -> [Statement].some(checkPar(a));


union Expr {
  This { meta: Object },
  ArrayExpr {
    meta        : Object,
    elements    : λ[a(c.ArrayOf(maybe(is(Expr))))(#)]
  },
  Obj {
    meta        : Object,
    properties  : λ[a(c.ArrayOf(is(Property)))(#)]
  },
  FnExpr {
    meta        : Object,
    id          : λ[a(maybe(is(Id)))(#)],
    params      : λ[a(c.ArrayOf(is(Pattern)))(#)],
    defaults    : λ[a(c.ArrayOf(is(Expr)))(#)],
    rest        : λ[a(maybe(is(Id)))(#)],
    body        : λ[a(c.Or([is(Block), is(Expr)]))(#)],
    generator   : a(c.Boolean)
  },
  Arrow {
    meta        : Object,
    params      : λ[a(c.ArrayOf(is(Pattern)))(#)],
    defaults    : λ[a(c.ArrayOf(is(Expr)))(#)],
    rest        : λ[a(maybe(is(Id)))(#)],
    body        : λ[a(c.Or([is(Block), is(Expr)]))(#)],
    generator   : a(c.Boolean)
  },
  Seq {
    meta        : Object,
    expressions : λ[a(c.ArrayOf(is(Expr)))(#)]
  },
  Unary {
    meta        : Object,
    operator    : a(unaryOp),
    prefix      : a(c.Boolean),
    argument    : λ[a(is(Expr))(#)]
  },
  Binary {
    meta        : Object,
    operator    : a(binaryOp),
    left        : λ[a(is(Expr))(#)],
    right       : λ[a(is(Expr))(#)]
  },
  Assignment {
    meta        : Object,
    operator    : a(assignmentOp),
    left        : λ[a(c.Or([is(Pattern), is(Member)]))(#)],
    right       : λ[a(is(Expr))(#)]
  },
  Update {
    meta        : Object,
    operator    : a(updateOp),
    argument    : λ[a(is(Expr))(#)],
    prefix      : a(c.Boolean)
  },
  Logical {
    meta        : Object,
    operator    : a(logicalOp),
    left        : λ[a(is(Expr))(#)],
    right       : λ[a(is(Expr))(#)]
  },
  Conditional {
    meta        : Object,
    test        : λ[a(is(Expr))(#)],
    consequent  : λ[a(is(Expr))(#)],
    alternate   : λ[a(is(Expr))(#)]
  },
  New {
    meta        : Object,
    callee      : λ[a(is(Expr))(#)],
    args        : λ[a(c.ArrayOf(is(Expr)))(#)]
  },
  Call {
    meta        : Object,
    callee      : λ[a(is(Expr))(#)],
    args        : λ[a(c.ArrayOf(is(Expr)))(#)]
  },
  Member {
    meta        : Object,
    object      : λ[a(is(Expr))(#)],
    property    : λ[a(is(Expr))(#)],
    computed    : a(c.Boolean)
  },
  Yield {
    meta        : Object,
    argument    : λ[a(maybe(is(Expr)))(#)]
  },
  Str {
    meta        : Object,
    value       : a(c.String)
  },
  Bool {
    meta        : Object,
    value       : a(c.Boolean)
  },
  Null {
    meta        : Object,
    value       : a(c.Null)
  },
  Num {
    meta        : Object,
    value       : a(c.Number)
  },
  Regexp {
    meta        : Object,
    value       : a(is(RegExp))
  },
} deriving (Base)
Expr::hasParent = λ(a) -> [Node].some(checkPar(a));


data Property {
  meta  : Object,
  key   : λ[a(c.Or([is(Str), is(Id)]))(#)],
  value : λ[a(is(Expr))(#)],
  kind  : a(c.Or([c.Value("init"), c.Value("get"), c.Value("set")]))
} deriving (Base)


union Pattern {
  Id { meta: Object, name: a(c.String) }
} deriving (Base)
Pattern::hasParent = λ(a) -> [Node].some(checkPar(a));
Id::hasParent = λ(a) -> [Node, Expr].some(checkPar(a));


union Clauses {
  SwitchCase {
    test       : λ[a(maybe(is(Expr)))(#)],
    consequent : λ[a(c.ArrayOf(is(Statement)))(#)]
  },
  CatchClause {
    param      : λ[a(is(Pattern))(#)],
    body       : λ[a(is(Block))(#)]
  }
}
Clauses::hasParent = λ(a) -> [Node].some(checkPar(a));


// -- ADT → Mozilla ----------------------------------------------------
Prog::toObject = λ[extend(this.meta, {
  type: 'Program',
  body: this.body.map(toObject)
})];

Empty::toObject = λ[extend(this.meta, {
  type: 'EmptyStatement'
})];

Block::toObject = λ[extend(this.meta, {
  type: 'BlockStatement',
  body: this.body.map(toObject)
})];

ExprStmt::toObject = λ[extend(this.meta, {
  type: 'ExpressionStatement',
  expression: this.expr.toObject()
})];

If::toObject = λ[extend(this.meta, {
  type: 'IfStatement',
  test: this.test.toObject(),
  consequent: this.consequent.toObject(),
  alternate: maybeObject(this.alternate)
})];

Label::toObject = λ[extend(this.meta, {
  type: 'LabeledStatement',
  label: this.label.toObject(),
  body: this.body.toObject()
})];

Break::toObject = λ[extend(this.meta, {
  type: 'BreakStatement',
  label: maybeObject(this.label)
})];

Continue::toObject = λ[extend(this.meta, {
  type: 'ContinueStatement',
  label: maybeObject(this.label)
})];

With::toObject = λ[extend(this.meta, {
  type: 'WithStatement',
  object: this.obj.toObject(),
  body: this.body.toObject()
})];

Switch::toObject = λ[extend(this.meta, {
  type: 'SwitchStatement',
  discriminant: this.discriminant.toObject(),
  cases: this.cases.map(toObject),
  lexical: this.lexical
})];

Return::toObject = λ[extend(this.meta, {
  type: 'ReturnStatement',
  argument: maybeObject(this.arg)
})];

Throw::toObject = λ[extend(this.meta, {
  type: 'ThrowStatement',
  argument: maybeObject(this.arg)
})];

Try::toObject = λ[extend(this.meta, {
  type: 'TryStatement',
  block: this.block.toObject(),
  handler: maybeObject(this.handler),
  finalizer: maybeObject(this.finalizer)
})];

While::toObject = λ[extend(this.meta, {
  type: 'WhileStatement',
  test: this.test.toObject(),
  body: this.body.toObject()
})];

DoWhile::toObject = λ[extend(this.meta, {
  type: 'DoWhileStatement',
  test: this.test.toObject(),
  body: this.body.toObject()
})];

For::toObject = λ[extend(this.meta, {
  type: 'ForStatement',
  init: maybeObject(this.init),
  test: maybeObject(this.test),
  update: maybeObject(this.udpate),
  body: this.body.toObject()
})];

ForIn::toObject = λ[extend(this.meta, {
  type: 'ForInStatement',
  left: this.left.toObject(),
  right: this.right.toObject(),
  body: this.body.toObject()
})];

ForOf::toObject = λ[extend(this.meta, {
  type: 'ForOfStatement',
  left: this.left.toObject(),
  right: this.right.toObject(),
  body: this.body.toObject()
})];

Let::toObject = λ[extend(this.meta, {
  type: 'LetStatement',
  head: this.head.map(toObject),
  body: this.body.toObject()
})];

Debugger::toObject = λ[extend(this.meta, {
  type: 'DebuggerStatement'
})];

FnDecl::toObject = λ[extend(this.meta, {
  type: 'FunctionDeclaration',
  id: this.id.toObject(),
  params: this.params.map(toObject),
  defaults: this.params.map(toObject),
  rest: maybeObject(this.rest),
  body: this.body.toObject(),
  generator: this.generator
})];

VarDecl::toObject = λ[extend(this.meta, {
  type: 'VariableDeclaration',
  declarations: this.declarations.map(toObject),
  kind: this.kind
})];

VarDeclarator::toObject = λ[extend(this.meta, {
  type: 'VariableDeclarator',
  id: this.id.toObject(),
  init: maybeObject(this.init)
})];

This::toObject = λ[extend(this.meta, {
  type: 'ThisExpression'
})];

ArrayExpr::toObject = λ[extend(this.meta, {
  type: 'ArrayExpression',
  elements: this.elements.map(maybeObject)
})];

Obj::toObject = λ[extend(this.meta, {
  type: 'ObjectExpression',
  properties: this.properties.map(toObject)
})];

Property::toObject = λ[extend(this.meta, {
  type: 'Property',
  key: this.key.toObject(),
  value: this.value.toObject(),
  kind: this.kind
})];

FnExpr::toObject = λ[extend(this.meta, {
  type: 'FunctionExpression',
  id: maybeObject(this.id),
  params: this.params.map(toObject),
  defaults: this.defaults.map(toObject),
  rest: maybeObject(this.rest),
  body: this.body.toObject(),
  generator: this.generator
})];

Arrow::toObject = λ[extend(this.meta, {
  type: 'ArrowExpression',
  id: maybeObject(this.id),
  params: this.params.map(toObject),
  defaults: this.defaults.map(toObject),
  rest: maybeObject(this.rest),
  body: this.body.toObject(),
  generator: this.generator
})];

Seq::toObject = λ[extend(this.meta, {
  type: 'SequenceExpression',
  expressions: this.expressions.map(toObject)
})];

Unary::toObject = λ[extend(this.meta, {
  type: 'UnaryExpression',
  operator: this.operator,
  prefix: this.prefix,
  argument: this.argument.toObject()
})];

Binary::toObject = λ[extend(this.meta, {
  type: 'BinaryExpression',
  operator: this.operator,
  left: this.left.toObject(),
  right: this.right.toObject()
})];

Assignment::toObject = λ[extend(this.meta, {
  type: 'AssignmentExpression',
  operator: this.operator,
  left: this.left.toObject(),
  right: this.right.toObject()
})];

Update::toObject = λ[extend(this.meta, {
  type: 'UpdateExpression',
  operator: this.operator,
  argument: this.argument.toObject(),
  prefix: this.prefix
})];

Logical::toObject = λ[extend(this.meta, {
  type: 'LogicalExpression',
  operator: this.operator,
  left: this.left.toObject(),
  right: this.right.toObject()
})];

Conditional::toObject = λ[extend(this.meta, {
  type: 'ConditionalExpression',
  test: this.test.toObject(),
  alternate: this.alternate.toObject(),
  consequent: this.consequent.toObject()
})];

New::toObject = λ[extend(this.meta, {
  type: 'NewExpression',
  callee: this.callee.toObject(),
  'arguments': this.args.map(toObject)
})];

Call::toObject = λ[extend(this.meta, {
  type: 'CallExpression',
  callee: this.callee.toObject(),
  'arguments': this.args.map(toObject)
})];

Member::toObject = λ[extend(this.meta, {
  type: 'MemberExpression',
  object: this.object.toObject(),
  property: this.property.toObject(),
  computed: this.computed
})];

Yield::toObject = λ[extend(this.meta, {
  type: 'YieldExpression',
  argument: maybeObject(this.argument)
})];

Str::toObject = λ[extend(this.meta, {
  type: 'Literal',
  value: this.value
})];
Bool::toObject = λ[extend(this.meta, {
  type: 'Literal',
  value: this.value
})];
Null::toObject = λ[extend(this.meta, {
  type: 'Literal',
  value: this.value
})];
Num::toObject = λ[extend(this.meta, {
  type: 'Literal',
  value: this.value
})];
Regexp::toObject = λ[extend(this.meta, {
  type: 'Literal',
  value: this.value
})];

Id::toObject = λ[extend(this.meta, {
  type: 'Identifier',
  name: this.name
})];

SwitchCase::toObject = λ[extend(this.meta, {
  type: 'SwitchCase',
  test: maybe(this.test),
  consequent: this.consequent.map(toObject)
})];

CatchClause::toObject = λ[extend(this.meta, {
  type: 'CatchClause',
  param: this.param.toObject(),
  body: this.body.toObject()
})];



// -- Exports ----------------------------------------------------------
module.exports = extend(
  Node, Statement, Declaration, Expr, Pattern, Clauses,
  { Property: Property, Statement: Statement, Expr: Expr, Node: Node,
    Clauses: Clauses, Pattern: Pattern, Declaration: Declaration }
)
