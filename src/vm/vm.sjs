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

// Note that this file makes a fairly heavy use of macros, because v8
// can't inline functions when they are too big, and we need the main
// intepreter loop to run some tight code.


// # module: siren/vm/vm
//
// A stack-based "bytecode" VM for the Siren programming language.
//
// -- Architecture -----------------------------------------------------
//
// Operations are represented as bytes, but values are just regular JS
// objects for simplicity. This way, instead of an `Uint8Array` we have
// a regular JavaScript array that is heterogeneous in that a cell can
// be either a byte number (representing an operation), or a JavaScript
// object.
//
// @note: Objects can only happen *after* certain opcodes.
//
// The VM keeps an `instruction pointer` to the current instruction
// being interpreted, and a `stack pointer` to the current stack frame.
// The stack has a limit of 2³² items, but each item in the stack is a
// stack frame object — so while the VM doesn't implement tail calls (yet),
// the number of frames in the stack is very reasonable. You can change
// the higher bound of the stack with the `maxStackSize` property.
//
// The decision to use JS objects here is mostly so we can just keep
// using v8's GC, instead of implementing our own. We also get v8 to
// optimise the dispatch of certain things for us.
//
// @todo: Reimplement in WebAssembly
//
// -- Error handling ---------------------------------------------------
//
// Siren is a safe and strongly-checked language, so errors are always
// trapped. The VM doesn't use try/catch, so native code should return
// an object of the form:
//
//     { failed: Boolean, error: Error | null, value: Any }
//
//
// -- Related ----------------------------------------------------------
//
// See the `operations.sjs` file for an overview of which opcodes we
// use. But things are more-or-less very similar to Forth and regular
// object oriented VMs.


// -- Dependencies -----------------------------------------------------
var opcodes = require('./opcodes');
var maybe = require('data.maybe');


// -- Aliases ----------------------------------------------------------
var {
  NOP, RETURN, NON_LOCAL_RETURN,
  SEND_0, SEND_1, SEND_2, SEND_3, SEND_4, SEND_5, SEND_6,
  CALL_NATIVE_0, CALL_NATIVE_1, CALL_NATIVE_2, CALL_NATIVE_3, CALL_NATIVE_4, CALL_NATIVE_5, CALL_NATIVE_6, CALL_NATIVE_VARIADIC,
  PUSH, POP, DUP, DROP,
  SET_LOCAL, GET_LOCAL,
  INTEGER_LOAD, FLOAT_LOAD, TEXT_LOAD, TUPLE_LOAD
} = opcodes;

var BYTECODE_CONTEXT_RANGE = 25;

// -- Macros -----------------------------------------------------------
macro (#assert) {
  rule { ($test:expr, $message) } => {
    if (!$test) {
      this.dump();
      throw new Error($message);
    }
  }
}

macro (#read) {
  rule { ($offset:expr) } => {
    this.instructions[this.currentInstruction + $offset]
  }
}

macro (#move) {
  rule { ($offset:expr) } => {
    this.currentInstruction += $offset;
  }
}

macro (#peek) {
  rule { ($offset:expr) } => {
    this.stack[this.stack.length - $offset];
  }
}

macro (#ensureStackRange) {
  rule { () } => {
    if (this.callStack.length >= this.maxStackSize) {
      this.dump();
      throw new RangeError("Stack overflow");
    }
  }
}

// -- Implementation ---------------------------------------------------

// #### class: StackFrame
// A stack frame contains information about a particular method or
// block invocation.
//
// @type: new (Scope, Context, Block, Number) -> StackFrame
function StackFrame(parent, context, block, returnPointer) {
  // ##### data: scope
  // The scope for this stack frame.
  //
  // @type: Scope
  this.scope = Object.create(parent)

  // ##### data: context
  // The context for this stack frame.
  //
  // @type: Context
  this.context = context.clone();

  // ##### data: block
  // The method/block object that we point to.
  //
  // @type: Block | Method
  this.block = block;

  // ##### data: method
  // The method this stack frame belongs to. Undefined for methods.
  //
  // @type: Method | null
  this.method = block.method;

  // ##### data: returnTo
  // A pointer to where to return in the instruction vector.
  //
  // @type: UInt32
  this.returnTo = returnPointer;
}

// #### class: VM
// Executes Siren-core bytecode.
//
// @type: new Runtime, Array(Byte | Object) -> VM
function VM(runtime, instructions) {
  var rt = runtime;

  // ##### data: instructions
  // An array of instructions to execute.
  //
  // @type: Array(Byte | Object)
  this.instructions = instructions;

  // ##### data: callStack
  // A stack of stack frames.
  //
  // @type: Array(StackFrame)
  this.callStack = [];

  // ##### data: stack
  // The stack where arguments get passed and stuff.
  //
  // @type: Array(Object)
  this.stack = [];

  // ##### data: currentInstruction
  // The instruction we're interpreting currently.
  //
  // @type: Integer
  this.currentInstruction = 0;

  // ##### data: currentFrame
  // The frame in which locals in which we should look things up. We start
  // in the global frame.
  //
  // @type: StackFrame | null
  this.currentFrame = new StackFrame(rt.protos.Scope, rt.context, {}, Infinity);

  // ##### data: maxStackSize
  // The maximum number of frames we can have on the call stack.
  //
  // @type: UInt32
  this.maxStackSize = Math.pow(2, 32);

  // ##### data: runtime
  // The runtime used for this VM.
  //
  // @type: Runtime
  this.runtime = rt;

}

// ##### method: run()
// Runs the VM from the current point, until it breaks or finishes.
//
// If it breaks, an Error object is returned with information about
// the error.
//
// @type: () -> SirenError
VM::run = function() {
  while (true) {
    #assert(this.currentInstruction >= 0 && this.currentInstruction < this.instructions.length,
            "Instruction pointer out of bounds!");

    switch(#read(0)) {

    // ###### code: UNREACHABLE
    // Marks points of the bytecode that the VM should never reach.
    // It's an error to get to this point.
    //
    // @type: [...] UNREACHABLE
    case UNREACHABLE:
      this.dump();
      throw new Error("The VM should never reach this point.\n"
                    + "Current instruction: " + this.currentInstruction + "\n"
                    + "Context:\n"
                    + JSON.stringify(this.instructions.slice(this.currentInstruction - BYTECODE_CONTEXT_RANGE, this.currentInstruction + BYTECODE_CONTEXT_RANGE)));

    // ###### code: NOP
    // Does nothing. Useful for operations that expect an instruction, but
    // have nothing relevant to do, like if/then/else.
    //
    // @type: [...] NOP -> [...]
    case NOP:
      #move(1);
      break;

    // ###### code: TRACE_INFO
    // Defines tracing information for the current code being executed.
    // Assumes the compiler outputs tracing information for each
    // expression.
    //
    // @type: [...] TRACE_INFO trace -> [...]
    case TRACE_INFO:
      throw new Error("Not implemented.");
      #move(2);
      break;

    // ----- Control flow ----------------------------------------------
    // These operations allow controlling the flow of code in the
    // VM.

    // ###### code: RETURN
    // Returns from the method or block, normally, to the previous position
    // in the call stack.
    //
    // @type: [...] RETURN -> [...]
    case RETURN:
      #assert(this.callStack.length > 0, "Can only return from inside functions/methods.");
      var returnTo = this.currentFrame.returnTo;
      this.currentFrame = this.callStack.pop();
      this.currentInstruction = returnTo;
      break;

    // ###### code: NON_LOCAL_RETURN
    // Returns from a block, to the method that defined that block.
    //
    // It's important to note that, for this to work, the method **must not** have
    // already returned. The NON_LOCAL_RETURN must ocurr during the execution of
    // the method, otherwise it's a runtime error.
    //
    // @type: [...] NON_LOCAL_RETURN -> [...]
    case NON_LOCAL_RETURN:
      #assert(this.callStack.length > 0, "Can only return (non-locally) from inside a block.");
      #assert(this.currentFrame.method != null, "Can't return (non-locally) from a block that isn't associated with a method");
      var methodFrame = this.currentFrame.method;
      while (this.currentFrame !== methodFrame) {
        this.currentFrame = this.callStack.pop();
        if (this.currentFrame == null) {
          this.dump();
          throw new Error("The method this block belongs to isn't on the call stack! This probably means that the block was called outside of the activation time of the method it belongs to.");
        }
      }
      this.currentFrame = this.callStack.pop();
      this.currentInstruction = methodFrame.returnTo;
      break;

    // ###### code: JUMP
    // Transfers control to a target instruction, represented as an integer
    // offset from the next instruction.
    //
    // @type: [...] JUMP offset -> [...]
    case JUMP:
      assert(this.instructions.length > this.currentInstruction, "JUMP requires an offsets.");
      this.currentInstruction += #read(1);
      break;

    // ----- Message sends ---------------------------------------------
    // While message sends are a form of control flow, we separate them
    // in their own category because there are particularities about
    // them.
    //
    // In Siren, a message can be sent to an object. All of the arguments,
    // including the object the message will be sent to, are passed on the
    // stack, while the name of the message is defined statically.
    //
    // Siren doesn't support variadic messages. All messages have a well
    // defined arity, and the maximum arity supported (right now) is 6.
    // A message with more than 6 arguments should just take an object
    // or tuple.
    //
    // `message` is always a single string, with the message identifier.

    // ###### code: SEND_0
    // @type: [... object] SEND_0 message -> [... Object]
    case SEND_0:
      this.send(#read(1), 0, this.currentInstruction + 2);
      break;

    // ###### code: SEND_1
    // @type: [... object arg1] SEND_1 message -> [... Object]
    case SEND_1:
      this.send(#read(1), 1, this.currentInstruction + 2);
      break;

    // ###### code: SEND_2
    // @type: [... object arg1 arg2] SEND_2 message -> [... Object]
    case SEND_2:
      this.send(#read(1), 2, this.currentInstruction + 2);
      break;

    // ###### code: SEND_3
    // @type: [... object arg1 arg2 arg3] SEND_3 message -> [... Object]
    case SEND_3:
      this.send(#read(1), 3, this.currentInstruction + 2);
      break;

    // ###### code: SEND_4
    // @type: [... object arg1 arg2 arg3 arg4] SEND_4 message -> [... Object]
    case SEND_4:
      this.send(#read(1), 4, this.currentInstruction + 2);
      break;

    // ###### code: SEND_5
    // @type: [... object arg1 arg2 arg3 arg4 arg5] SEND_5 message -> [... Object]
    case SEND_5:
      this.send(#read(1), 5, this.currentInstruction + 2);
      break;

    // ###### code: SEND_6
    // @type: [... object arg1 arg2 arg3 arg4 arg5 arg6] SEND_6 message -> [... Object]
    case SEND_6:
      this.send(#read(1), 6, this.currentInstruction + 2);
      break;

    // ----- Stack manipulation ----------------------------------------
    // Siren uses a stack-based VM, which means that arguments to functions
    // and other pieces of data are all pushed onto a particular stack, and
    // when functions need them, they just pop the arguments from the stack
    // to use them.

    // ###### code: PUSH
    // Puts a new value on the stack. Used for passing value to or returning
    // values from functions/operations.
    //
    // Note that for primitives, the LOAD_* operations are used instead.
    //
    // @type: [...] PUSH value -> [... value]
    case PUSH:
      var data = #read(1);
      this.stack.push(data);
      #move(2);
      break;

    // ###### code: DUP
    // Duplicates the item at the top of the stack.
    //
    // @type: [... a] DUP -> [... a a]
    case DUP:
      assert(this.stack.length > 0, "DUP requires at least one item on the stack.");
      var data = #peek(0);
      this.stack.push(data);
      #move(1);
      break;

    // ###### code: DROP
    // Removes the item from the top of the stack.
    //
    // @type: [... a] DROP -> [...]
    case DROP:
      assert(this.stack.length > 0, "DROP requires at least one item on the stack.");
      this.stack.pop();
      #move(1);
      break;

    // ###### code: SWAP
    // Inverts the order of the items at the top of the stack.
    //
    // @type: [... a b] SWAP -> [... b a]
    case SWAP:
      var l = this.stack.length;
      assert(l >= 2, "SWAP requires at least 2 items on the stack.");
      var a = this.stack[l - 2];
      var b = this.stack[l - 1];
      this.stack[l - 2] = b;
      this.stack[l - 1] = a;
      #move(1);
      break;


    // ------ Local scopes ---------------------------------------------
    // Siren has first-class scoping. Each stack frame contains a pointer
    // to its Scope object and its Context object. The operations on
    // local scoping allows one to define new entries on the Scope object,
    // or retrieve existing entries.
    //
    // Entries are pretty much retrieved through a message send. Attaching
    // a new one is equivalent to attaching a memoised unary message to
    // an object.

    // ###### code: SET_LOCAL
    // Defines a new local variable.
    //
    // @type: [... a] SET_LOCAL name -> [...]
    case SET_LOCAL:
      assert(this.stack.length > 0, "SET_LOCAL requires one value on the stack.")
      var value = this.stack.pop();
      this.currentFrame.scope.$define(#read(1), value);
      #move(2);
      break;

    // ###### code: GET_LOCAL
    // Loads a local variable.
    //
    // @type: [...] GET_LOCAL name -> [... a]
    case GET_LOCAL:
      this.stack.push(this.currentFrame.scope);
      this.send(#read(1), 0, this.currentInstruction + 2);
      break;


    // -- Loading primitives -------------------------------------------

    // ###### code: INTEGER_LOAD
    // Loads a big integer in the stack.
    //
    // @type: [...] INTEGER_LOAD string -> [... string]
    case INTEGER_LOAD:
      var num = #read(1);
      assert(typeof num === "string", "Expected an integer.");
      this.stack.push(new this.runtime.Integer(bignum(num)));
      #move(2);
      break;

    // ###### code: FLOAT_LOAD
    // Loads a floating point in the stack.
    //
    // @type: [...] FLOAT_LOAD number -> [... number]
    case FLOAT_LOAD:
      var num = #read(1);
      assert(typeof num === "number", "Expected a number.");
      this.stack.push(new this.runtime.Float(num));
      #move(2);
      break;

    // ###### code: TEXT_LOAD
    // Loads a text value in the stack.
    //
    // @type: [...] TEXT_LOAD string -> [... string]
    case TEXT_LOAD:
      var text = #read(1);
      assert(typeof text === "string", "Expected a text.");
      this.stack.push(new this.runtime.Text(text));
      #move(2);
      break;

    // ###### code: TUPLE_LOAD
    // Loads a tuple in the stack.
    //
    // @type: [... a₁ a₂ ... aₙ] TUPLE_LOAD n -> [... tuple]
    case TUPLE_LOAD:
      var size = #read(1);
      assert(typeof size === "number", "Expected an integer.");
      var items = [];
      for (var i = 0; i < size; ++i) items.push(this.stack.pop());
      this.stack.push(new this.runtime.Tuple(items));
      #move(2);
      break;

    // ###### code: OBJECT_CLONE
    // Clones an object.
    //
    // @type: [... object] OBJECT_CLONE -> object
    case OBJECT_CLONE:
      assert(this.stack.length > 0, "OBJECT_CLONE requires an object on the stack.");
      var object = this.stack.pop();
      this.stack.push(Object.create(object));
      #move(1);
      break;

    // ###### code: OBJECT_DEFINE_METHOD
    // Defines a method in the object.
    //
    // @type: [... object] OBJECT_DEFINE_METHOD name offset size -> [... object]
    case OBJECT_DEFINE_METHOD:
      assert(this.stack.length > 0, "OBJECT_DEFINE_METHOD requires an object on the stack.");
      assert(this.instructions.length > this.currentInstruction + 2, "OBJECT_DEFINE_METHOD requires name, offset, and size following its opcode.");
      var object = #peek(1);
      var name = #read(1);
      var offset = #read(2) + 3;
      var size = #read(3);
      var method = new this.runtime.Method(this.currentFrame.scope, this.currentFrame.context);
      method.baseInstructionPointer = this.currentInstruction + offset;
      method.endInstructionPointer = this.currentInstruction + offset + size;
      throw new Error("not implemented");
      #move(4);
      break;
    }

    if (this.currentInstruction >= this.instructions.length) {
      return true;
    }
  }
};

// ##### method: send(message, argCount, returnTo)
// Sends a message to an object.
//
// @type: (String, Int, Int) -> ()
VM::send = function(message, argCount, returnTo) {
  var context = this.currentFrame.context;
  var object = #peek($argCount + 1);
  var selector = context.lookup(object, message);

  // Check if there's a message defined in the object
  if (selector) {
    var method = object[selector];
  } else {
    // no method was found for the message
    var selector = context.lookup(object, "does-not-understand:");
    if (selector) {
      // Get the old arguments from the stack
      var oldArguments = [];
      for (var i = 0; i < $argCount; ++i)
        oldArguments.push(this.stack.pop());

      // Put the message in the stack
      this.stack.push(new this.runtime.Message(message, oldArguments, this.currentFrame.context));
      var method = object[selector];
    } else {
      // No "does-not-understand" message found. This is a very weird
      // error that can only happen when either objects haven't been
      // properly initialised, or a message has been sent with an
      // empty context!
      this.dump();
      throw new Error("Message not understood: " + message);
    }
  }
  #assert(method != null, "The operation pointed by the selector is invalid.");

  // Methods can be a primitive (JS function), or a regular Siren
  // method.
  //
  // For primitive functions, we just invoke them passing the
  // VM as the first argument, the primitive can then pop the stuff it
  // needs from the stack.
  //
  // For Siren methods, we create a stack frame, and jump to the pointer
  // specified in the object. It's IMPORTANT to note that this pointer
  // CAN CHANGE. Methods can be replaced at runtime, while maintaining
  // the same locals!
  if (method.isPrimitive) {
    method.primitive(this);
    this.currentInstruction = returnTo;
  } else {
    var frame = new StackFrame(method.scope,
                               method.context,
                               method,
                               returnTo);
    this.currentInstruction = method.baseInstructionPointer;
    this.callStack.push(this.currentFrame);
    #ensureStackRange();
    this.currentFrame = frame;
  }
};

// ##### method: dump()
// Outputs debugging information from the current place in the execution.
//
// @type: () -> ()
VM::dump = function() {

};

// -- Exports ----------------------------------------------------------
module.exports = VM;
