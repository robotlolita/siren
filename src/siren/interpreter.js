//----------------------------------------------------------------------
//
// This source file is part of the Siren project.
//
// See LICENCE for licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const Expr = require('./ast');
const Parser = require('./parser').SirenParser;
const { Context, Brand, Subject } = require('./runtime');

const last = (xs) => {
  if (xs.length === 0) {
    throw new Error('Empty list');
  }
  return xs[xs.length - 1];
}

// Runtime
const any = new Brand('Any');
const num = new Brand('Number', any);
const str = new Brand('String', any);


// Environment
class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.context = new Context(parent ? parent.context : null);
  }

  clone() {
    return new Environment(this);
  }

  define(message, types, fn) {
    this.context.defineOrGet(message).add(types, fn);
    return this;
  }

  send(message, args) {
    return this.context.get(message)(...args);
  }
}

class World {
  constructor() {
    this.modules = [];
    this.environment = new Environment();
  }
}

class Module {
  constructor(name, arg, body) {
    this.name = name;
    this.arg = arg;
    this.body = body;
  }

  run(world) {
    const topEnv = world.environment.clone();
    topEnv.define(this.arg);
    this.body.forEach(n => evaluate(topEnv, n));
    return topEnv;
  }
}


// Evaluator
const evaluate = (env, node) => node.matchWith({
  // Values
  Id: ({ name }) => name,
  Number: ({ value }) => new Subject([num], { value }),
  String: ({ value }) => new Subject([str], { value }),
  Apply: ({ message, args }) => env.send(evaluate(env, message), args.map(x => evaluate(env, x))),

  Define: ({ message, types, args, body }) => {
    const names = args.map(x => evaluate(env, x));
    env.define(evaluate(env, message), types.map(x => evaluate(env, x)), (...given) => {
      const newEnv = env.clone();
      names.map((n, i) => {
        newEnv.define(n, [], () => given[i]);
      });
      return last(body.map(n => evaluate(newEnv, n)));
    });
  },

  // Top-level
  Module: ({ name, arg, body }) => {
    return new Module(evaluate(env, name), evaluate(env, arg), body);
  }
});


const parse = (text) => Parser.matchAll(text, 'program');
const run = (program) => {
  const world = new World();
  world.environment.define('Any', [], () => any);
  world.environment.define('Number', [], () => num);
  world.environment.define('String', [], () => str);
  world.environment.define('succ', [num], (a) => new Subject([num], { value: a.state.value + 1 }));
  const ast = parse(program);
  return evaluate(world.environment, ast).run(world).send('main', []);
};


module.exports = {
  parse,
  run,
  evaluate
}