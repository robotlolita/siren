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

macro (#send) {
  rule { ($argCount) } => {
    var message = #read(1);
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
        this.stack.push(new Message(message, oldArguments, this.currentFrame.context));
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
    } else {
      var frame = new StackFrame(method.scope,
                                 method.context,
                                 method,
                                 this.currentInstruction + 1);
      this.currentInstruction = method.baseInstructionPointer;
      this.callStack.push(this.currentFrame);
      #ensureStackRange();
      this.currentFrame = frame;
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
  this.scope = new Scope(parent);
  this.context = new Context(context);
  this.block = block;
  this.method = block.method;
  this.returnTo = returnPointer;
}

// #### class: VM
// Executes Siren-core bytecode.
//
// @type: new Array(Byte | Object) -> VM
function VM(instructions) {
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
  // The frame in which locals in which we should look things up.
  //
  // @type: StackFrame | null
  this.currentFrame = null;

  // ##### data: maxStackSize
  // The maximum number of frames we can have on the call stack.
  //
  // @type: UInt32
  this.maxStackSize = Math.pow(2, 32);
}

// ##### method: run()
// Runs the VM from the current point, until it breaks or finishes.
//
// If it breaks, an Error object is returned with information about
// the error.
//
// @type: () -> SirenError
VM::run = function() {
  var { NOP, RETURN, NON_LOCAL_RETURN,
        SEND_0, SEND_1, SEND_2, SEND_3, SEND_4, SEND_5, SEND_6,
        CALL_NATIVE_0, CALL_NATIVE_1, CALL_NATIVE_2, CALL_NATIVE_3, CALL_NATIVE_4, CALL_NATIVE_5, CALL_NATIVE_6, CALL_NATIVE_VARIADIC,
        PUSH, POP, DUP, DROP
      } = opcodes;

  while (true) {
    #assert(this.currentInstruction > 0 && this.currentInstruction < this.instructions.length,
            "Instruction pointer out of bounds!");

    switch(#read(0)) {
    case NOP:
      #move(1);
      break;

    case RETURN:
      #assert(this.callStack.length > 0, "Can only return from inside functions/methods.");
      var returnTo = this.currentFrame.returnTo;
      this.currentFrame = this.callStack.pop();
      this.currentInstruction = returnTo;
      this.stack.push(#read(1));
      break;

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
      this.stack.push(#read(1));
      break;

    case SEND_0:
      #send(0);
      break;

    case SEND_1:
      #send(1);
      break;

    case SEND_2:
      #send(2);
      break;

    case SEND_3:
      #send(3);
      break;

    case SEND_4:
      #send(4);
      break;

    case SEND_5:
      #send(5);
      break;

    case SEND_6:
      #send(6);
      break;

    case CALL_NATIVE_0:
    case CALL_NATIVE_1:
    case CALL_NATIVE_2:
    case CALL_NATIVE_3:
    case CALL_NATIVE_4:
    case CALL_NATIVE_5:
    case CALL_NATIVE_6:
    case CALL_NATIVE_VARIADIC:
      throw new Error("not implemented");
      break;

    case PUSH:
      var data = #read(1);
      this.stack.push(data);
      #move(2);
      break;

    case DUP:
      var data = #peek(0);
      this.stack.push(data);
      #move(1);
      break;

    case DROP:
      this.stack.pop();
      #move(1);
      break;

    case SET_LOCAL:
    case GET_LOCAL:
      throw new Error("not implemented");

    case INTEGER_LOAD:
      throw new Error("not implemented");
    }
  }
};

// ##### method: dump()
// Outputs debugging information from the current place in the execution.
//
// @type: () -> ()
VM::dump = function() {

};
