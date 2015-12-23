# Siren

> **This document is a work in progress.**

Siren is an experimental prototype and context-based object oriented
programming language. It differs from most existing languages in that it
uses a single delegation slot for sharing (and cheap instantiation), but
allows controlled lexical extensions through contextual computations.

This document describes the formal syntax for Siren, provides a formal
semantics for the Core-Siren language, and an informal semantics for the
whole Siren language.


## Core-Siren

Core-Siren is a minimal, pure, object-oriented, and context-based
language. It only exists to formalise the Siren language, but it's not
intended for practical usage by a programmer. It can be considered a
superset of the Lambda Calculus.


### Syntax

This language has only a handful of concepts:

- **Label**: A label is a human-readable identifier for a selector
  within a context.
- **Selector**: A selector is a unique identifier for a message.
- **Object**: An object is a finite partial function mapping a
  `Selector` to a `Method`.
- **Method**: A method is a lambda with two arguments, with the first
  one being the object that's the receiver of the message.
- **Context**: A context is a finite partial function mapping an
  `(Object, Label)` tuple to a `Selector`.
- **Perspective**: A tuple of `(Object, Context)`, which is the result
  of refining an object.

Formally, these concepts are defined as follows:

<div>
\begin{align*}

  \mathbb{L} :: & \{ \ell_1, \ell_2, \ldots, \ell_n \} \\
  \mathbb{S} :: & \{ s_1, s_2, \ldots, s_n \} \\
  M          :: & \lambda o x. e \\
  P          :: & \langle o, c \rangle \\
  O          :: & \{ s_1 \mapsto M_1, \ldots, s_n \mapsto M_n \} \\
  C          :: & \{ \langle o_1, \ell_1 \rangle \mapsto s_1,
                     \ldots,
                     \langle o_n, \ell_n \rangle \mapsto s_n
                  \} 

\end{align*}
</div>


To work with these concepts Core-Siren offers a handful of operations:

- **Message send**: Invokes an operation, selected by a `Selector`, in an `Object`.
- **Contextual send**: Invokes an operation, selected by a `Label` in a
  particular `Context`, in an `Object`.
- **Refinement**: Given two objects, the concatenation of their tuples,
  such that the latter object has a higher precedence.
- **Context aggregation**: Given a context and a perspective, the concatenation of
  their triplets, such that the latter context has a higher precedence.
- **Contextual evaluation**: Allows an expression to be evaluated in a
  specific context.

Formally, these operations are defined as follows:

<div>
\begin{align*}

  \ell & \in \mathbb{L} \\
  s & \in \mathbb{S} \\
  c & \in C \\
  o & \in O \\
  p & \in P \\

  v & \in \mathbb{V} = \mathbb{L} \cup \mathbb{S} \cup C \cup O \cup P \\

  e ::= & \ell \, | \, s \, | \, c  \, |  \, o \, | \, p \\

      | & \, {\bf obj} \, e
        && \quad \quad (\text{Projection}) \\

      | & \, \langle e_1, e_2 \rangle . e_3(e_4)
        && \quad \quad (\text{Contextual send}) \\

      | & \, e_1 \, {\bf with} \, e_2
        && \quad \quad (\text{Refinement}) \\

      | & \, e_1, e_2
        && \quad \quad (\text{Context aggregation}) \\

      | & \, {\bf use} \, e_1 \, {\bf in} \, e_2
        && \quad \quad (\text{Contextual evaluation}) 

\end{align*}
</div>


### Semantics

Core-Siren only has dynamic semantics, which are presented in this
section.

#### Object definition and refinement

Objects in Core-Siren are defined by refining existing objects, with the
empty set being the trivial object. Refining an object yields a new
context and a new object.

<div>
\begin{equation} \label{ref_ev1}
  \frac{
    e \longrightarrow e'
  }{
    e_1 \, {\bf with} \, e_2
    \longrightarrow
    e_1' \, {\bf with} \, e_2
  }
\end{equation}

\begin{equation} \label{ref_ev2}
  \frac{
    e \longrightarrow e'
  }{
    o_1 \, {\bf with} \, e_2
    \longrightarrow
    o_1 \, {\bf with} \, e_2'
  }
\end{equation}

\begin{equation} \label{ref_ev3}
  \frac{
    e \longrightarrow e'
  }{
    o_1 \, {\bf with} \, \langle e_1, e_2 \rangle
    \longrightarrow
    o_1 \, {\bf with} \, \langle e_1', e_2 \rangle
  }
\end{equation}

\begin{equation} \label{ref_ev4}
  \frac{
    e \longrightarrow e'
  }{
    o_1 \, {\bf with} \, \langle o_2, e_2 \rangle
    \longrightarrow
    o_1 \, {\bf with} \, \langle o_2, e_2' \rangle
  }
\end{equation}


\begin{equation} \label{ref}
  \frac{
    c = \{ \langle o_2, \ell_1 \rangle \mapsto s_1,
           \ldots,
            \langle o_2, \ell_n \rangle \mapsto s_n
        \}
    \quad
    o_2 = \{ s_1 \mapsto M_1, \ldots, s_n \mapsto M_n \}
  }{
    o_1 \, {\bf with} \, \langle o_2, c \rangle \longrightarrow \langle o_1 + o_2, c \rangle 
  }
\end{equation}

\begin{equation} \label{obj_ev1}
  \frac{
    e \longrightarrow e'
  }{
    {\bf obj} \, e \longrightarrow {\bf obj} \, e'
  }
\end{equation}

\begin{equation} \label{obj_ev2}
  \frac{
    e \longrightarrow e'
  }{
    {\bf obj} \, \langle e_1, e_2 \rangle \longrightarrow {\bf obj} \, \langle e_1', e_2 \rangle
  }
\end{equation}

\begin{equation} \label{obj_ev3}
  \frac{
    e \longrightarrow e'
  }{
    {\bf obj} \, \langle o, e_2 \rangle \longrightarrow {\bf obj} \, \langle o, e_2' \rangle
  }
\end{equation}

\begin{equation} \label{obj}
  \frac{
  }{
    {\bf obj} \, \langle o, c \rangle \longrightarrow o
  }
\end{equation}


</div>


#### Message sends

A message can be send to an object in a particular context. The context
provides the mapping of labels to selectors within an object.

<div>
\begin{equation} \label{csend_ev1}
  \frac{
    e \longrightarrow e'
  }{
    \langle e_1, e_2 \rangle.e_3(e_4) \longrightarrow \langle e_1', e_2 \rangle .e_3(e_4)
  }
\end{equation}

\begin{equation} \label{csend_ev2}
  \frac{
    e \longrightarrow e'
  }{
    \langle o, e_2 \rangle.e_3(e_4) \longrightarrow \langle o, e_2' \rangle .e_3(e_4)
  }
\end{equation}


\begin{equation} \label{csend_ev3}
  \frac{
    e \longrightarrow e'
  }{
    \langle o, c \rangle.e_3(e_4) \longrightarrow \langle o, c \rangle .e_3'(e_4)
  }
\end{equation}


\begin{equation} \label{csend_ev4}
  \frac{
    e \longrightarrow e'
  }{
    \langle o, c \rangle.\ell(e_4) \longrightarrow \langle o, c \rangle .\ell(e_4')
  }
\end{equation}

\begin{equation} \label{csend}
  \frac{
    o = \{ s_1 \mapsto \lambda o x. e_1, \ldots \}
    \quad
    c = \{ \langle o, \ell_1 \rangle \mapsto s_1, \ldots \}
  }{
    \langle o, c \rangle.\ell_1(v) \longrightarrow (\lambda o x. e_1) o v
  }
\end{equation}
</div>

#### Context aggregation

A perspective may be added to a context, yielding a new context $C'$
that is the concatenation of the triplets.

<div>
\begin{equation} \label{cagg_ev1}
  \frac{
    e \longrightarrow e'
  }{
    e_1, e_2 \longrightarrow e_1', e_2
  }
\end{equation}

\begin{equation} \label{cagg_ev2}
  \frac{
    e \longrightarrow e'
  }{
    c_1, e_2 \longrightarrow c_1, e_2'
  }
\end{equation}

\begin{equation} \label{cagg}
  \frac{}{
    c_1, \langle o_1, c_2 \rangle \longrightarrow c_1 + c_2
  }
\end{equation}
</div>


#### Contextual evaluation

Message sends can be executed in a particular context.


<script type="text/x-mathjax-config">
MathJax.Hub.Config({
  TeX: { equationNumbers: { autoNumber: "AMS" } },
  tex2jax: {
    inlineMath: [ ['$','$'], ["\\(","\\)"] ],
    processEscapes: true
  }  
});
</script>
<script type="text/javascript" src="https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>
<link href="markdown.css" rel="stylesheet" type="text/css">
