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

// # module: siren/vm/opcodes
//
// Constants for the instruction codes.
module.exports = {
  // -- Control flow ---------------------------------------------------

  // ### data: NOP
  // An empty operation which exists only for instructions that expect
  // two operations to be provided, but has only one meaningful one
  // to provide (if/then/else, for example).
  //
  // @type: NOP
  NOP: 0x00,

  // ### data: RETURN
  // Returns a value from the current block or method.
  //
  // @type: object RETURN -> object
  RETURN: 0x01,

  // ### data: NON_LOCAL_RETURN
  // When in a block, returns a value from the method the block was
  // defined in.
  //
  // @type: object NON_LOCAL_RETURN -> object
  NON_LOCAL_RETURN: 0x02,

  // ### data: SEND_0
  // Sends a nullary message to an object.
  //
  // @type: object SEND_0 message_name -> Object
  SEND_0: 0x03,

  // ### data: SEND_1
  // Sends an unary message to an object.
  //
  // @type: object arg1 SEND_1 message_name -> Object
  SEND_1: 0x04,

  // ### data: SEND_2
  // Sends a binary message to an object.
  //
  // @type: object arg1 arg2 SEND_2 message_name -> Object
  SEND_2: 0x05,

  // ### data: SEND_3
  // Sends a ternary message to an object.
  //
  // @type: object arg1 arg2 arg3 SEND_3 message_name -> Object
  SEND_3: 0x06,

  // ### data: SEND_4
  // Sends a quaternary message to an object.
  //
  // @type: object arg1 arg2 arg3 arg4 SEND_4 message_name -> Object
  SEND_4: 0x07,

  // ### data: SEND_5
  // Sends a quintenary message to an object.
  //
  // @type: object arg1 arg2 arg3 arg4 arg5 SEND_5 message_name -> Object
  SEND_5: 0x08,

  // ### data: SEND_6
  // Sends a senary message to an object.
  //
  // @type: object arg1 arg2 arg3 arg4 arg5 arg6 SEND_6 message_name -> Object
  SEND_6: 0x09,

  // ### data: CALL_NATIVE_0
  // Calls a native function with 0 arguments
  //
  // @type: CALL_NATIVE_0 function -> JSResult
  CALL_NATIVE_0: 0x0a,

  // ### data: CALL_NATIVE_1
  // Calls a native function with 1 arguments
  //
  // @type: arg1 CALL_NATIVE_1 function -> JSResult
  CALL_NATIVE_1: 0x0b,

  // ### data: CALL_NATIVE_2
  // Calls a native function with 2 arguments
  //
  // @type: arg1 arg2 CALL_NATIVE_2 function -> JSResult
  CALL_NATIVE_2: 0x0c,

  // ### data: CALL_NATIVE_3
  // Calls a native function with 0 arguments
  //
  // @type: arg1 arg2 arg3 CALL_NATIVE_3 function -> JSResult
  CALL_NATIVE_3: 0x0d,

  // ### data: CALL_NATIVE_4
  // Calls a native function with 4 arguments
  //
  // @type: arg1 arg2 arg3 arg4 CALL_NATIVE_4 function -> JSResult
  CALL_NATIVE_4: 0x0e,

  // ### data: CALL_NATIVE_5
  // Calls a native function with 5 arguments
  //
  // @type: arg1 arg2 arg3 arg4 arg5 CALL_NATIVE_5 function -> JSResult
  CALL_NATIVE_5: 0x0f,

  // ### data: CALL_NATIVE_6
  // Calls a native function with 6 arguments
  //
  // @type: arg1 arg2 arg3 arg4 arg5 arg6 CALL_NATIVE_6 function -> JSResult
  CALL_NATIVE_6: 0x10,

  // ### data: CALL_NATIVE_VARIADIC
  // Calls a native function with variadic arguments
  //
  // @type: tuple CALL_NATIVE_VARIADIC function -> JSResult
  CALL_NATIVE_VARIADIC: 0x11,


  // -- Stack manipulation ---------------------------------------------

  // ### data: PUSH
  // Pushes a value in the stack.
  //
  // @type: PUSH object
  PUSH: 0x12,

  // ### data: DUP
  // Duplicates the item at the top of the stack.
  //
  // @type: object DUP
  DUP: 0x13,

  // ### data: DROP
  // Drops the item at the top of the stack.
  //
  // @type: object DROP
  DROP: 0x14,

  // -- Manipulating locals --------------------------------------------

  // ### data: SET_LOCAL
  // Stores a name in the local scope.
  //
  // @type: object SET_LOCAL name
  SET_LOCAL: 0x15,

  // ### data: GET_LOCAL
  // Gets a name from the local scope, pushes it on the stack.
  //
  // @type: GET_LOCAL name -> object
  GET_LOCAL: 0x16,

  // -- Primitives -----------------------------------------------------

  // ### data: INTEGER_LOAD
  // Loads an integer on the stack.
  //
  // @type: INTEGER_LOAD integer -> integer
  INTEGER_LOAD: 0x17,

  // ### data: FLOAT_LOAD
  // Loads a float on the stack.
  //
  // @type: FLOAT_LOAD float -> float
  FLOAT_LOAD: 0x18,

  // ### data: TEXT_LOAD
  // Loads a text on the stack.
  //
  // @type: TEXT_LOAD text -> text
  TEXT_LOAD: 0x19,

  // ### data: TUPLE_LOAD
  // Loads a tuple on the stack.
  //
  // @type: object₁ object₂ ... objectₙ TUPLE_LOAD n -> tuple
  TUPLE_LOAD: 0x20

}
