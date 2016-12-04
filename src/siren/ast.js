//----------------------------------------------------------------------
//
// This source file is part of the Siren project.
//
// See LICENCE for licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { data, show, serialize } = require('folktale/core/adt');

const Expr = data('Siren:Expr', {
  Any() {
    return {};
  },

  Id(name) {
    return { name };
  },

  Module(name, arg, body) {
    return { name, arg, body };
  },

  Number(value) {
    return { value };
  },

  String(value) {
    return { value };
  },

  Block(args, body) {
    return { args, body };
  },

  Return(expr) {
    return { expr };
  },

  Apply(message, args) {
    return { message, args };
  },

  Define(message, types, args, body) {
    return { message, types, args, body }
  },

  Let(name, expr) {
    return { name, expr };
  },

  Clone(parent, block) {
    return { parent, block };
  }
}).derive(show, serialize);


module.exports = Expr;