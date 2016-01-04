//----------------------------------------------------------------------
//
// This source file is part of the Siren project.
//
// Copyright (C) 2013-2015 Quildreen Motta.
// Licensed under the MIT licence.
//
// See LICENCE for licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

macro (#toString) {
  case { _ ($toks ...) } => {
    return [makeValue(#{ $toks ... }.map(unwrapSyntax).join(' '), #{ here })];
  }
}

macro (#enum) {
  rule { $name:ident { $items:ident (,) ... } } => {
    var $name = { #enum.count 0 $items (,) ... };
  }

  rule { . count $index $item:ident, $rest:ident (,) ... } => {
    $item: #toString($item),
    #enum.count ($index + 1) $rest (,) ...
  }

  rule { . count $index $item:ident } => {
    $item: #toString($item)
  }

  rule { . count $index } => {

  }
}

// # module: siren/vm/opcodes
//
// Constants for the instruction codes.

#enum OPCODES {
  UNREACHABLE,
  NOP,
  TRACE_INFO,

  RETURN,
  NON_LOCAL_RETURN,
  JUMP,

  SEND_0,
  SEND_1,
  SEND_2,
  SEND_3,
  SEND_4,
  SEND_5,
  SEND_6,

  PUSH,
  DUP,
  DROP,
  SWAP,

  SET_LOCAL,
  GET_LOCAL,

  LOAD_INTEGER,
  LOAD_FLOAT,
  LOAD_TEXT,
  LOAD_TUPLE,

  OBJECT_CLONE,
  OBJECT_DEFINE_METHOD
}


module.exports = OPCODES;
