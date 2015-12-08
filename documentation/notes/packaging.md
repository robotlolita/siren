# Packaging

Most languages have a concept of "packages" and tools for managing
them. The Node ecosystem has npm, Haskell has Cabal, Python has PIP,
Ruby has Gems, Java has Maven, Clojure has Leiningen, Linux has
Nix/apt/yum/port/pacman/etc; I believe most of them suffer from a very
annoying problem: they help you install packages, but not necessarily to
*describe* how packages are made.


## Distributing software

There are two important tools that I associate with a package management
tool:

1) Being able to generate a package from a description;
2) Being able to install a package from some constraint;

(2) is a problem that all package managers try to tackle one way or
another. Most end up with some kind of global installation, which makes
updating individual packages difficult. npm and Nix both get this right.

(1) is a problem that almost no package manager really tries to tackle,
with Nix being one of the few exceptions. But it's easy to understand
how important it is to solve this problem when you look at Package
Managers as a solution to the "Software Distribution" problem. Packages
are the essential unity of distributing software, so it's only logical
that package managers give you tools to generate them.

In essence, we need to look at the software distribution problem at a
whole, which includes all the people we're interested in distributing
our software to:

- End users;
- Developers;
- System administrators;

Besides, we also need to look at the platforms we want to support, the
kind of configurations in those platforms we want to support, etc, etc,
etc. It quickly becomes a lot of stuff. Consider 3 user roles × 6
platforms (linux/windows/osx 32bit and 64bit) × 4 window managers × ...

Now, imagine that despite having to build all of that in order to
distribute one's software, they had to do it all *manually*! It's not
only error prone, but it makes it highly unlikely that people would
*want* to support all of that, since it's too much work.

For Siren, I'd like to automate as much of this as possible, and let
people focus on just writing their applications. Because, frankly,
there's just no excuse for our tools to NOT automate the whole
distribution problem for us.


## Approach

Siren's packaging must understand that there are different *kinds* of
packages, which will generate different *artefacts*.

Kinds are not a limited or pre-defined list, they vary with context, so
whatever provides them must also be *refinable*.

In order to build *artefacts*, people need to transform or generate
different files according to some well-defined *build rules*. Some of
these transformations might be expensive, so ideally we would only run
them when strictly needed, for this we need a well-defined *dependency
relationship* between inputs and outputs.

Sometimes, many targets are supported by a kind, but we might not be
interested in all of them. It should be possible to choose which
*targets* we care about for a particular package.

Some packages provide additional features for the places where they're
installed. These *integration* points are hard, because most of the time
you get no actual feedback. So, it should be encouraged for a package,
when integrating with some system, to provide feedback on whether things
are working, or what's missing (ideally fixing itself, or providing
concrete and actionable suggestions).

People who are interested in packages must be able to find them. And the
right version of them. For this, we need *metadata*. Meta-data is
conventional and ad-hoc. It can *be extended from the outside*. Not all
packages are equal, and it might make sense to give some additional
meta-data. It's also necessary for people to be able to search packages
by their meta-data, and link or install them by specifying constraints
in meta-data as well.


## References

- [Software You Can Use](https://glyph.twistedmatrix.com/2015/09/software-you-can-use.html)
- [nar](https://github.com/h2non/nar)
- [Nix - The Purely Functional Package Manager](https://nixos.org/nix/)
