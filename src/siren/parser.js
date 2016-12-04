var ometajs_ = require("ometajs");

var AbstractGrammar = ometajs_.grammars.AbstractGrammar;

var BSJSParser = ometajs_.grammars.BSJSParser;

var BSJSIdentity = ometajs_.grammars.BSJSIdentity;

var BSJSTranslator = ometajs_.grammars.BSJSTranslator;

var Expr = require("./ast");

var reserved = [ "module", "where", "define", "import", "exposing", "use", "in", "let", "do", "end", "=>" ];

function isValid(a) {
    return reserved.indexOf(a) === -1;
}

function get(k) {
    return function(o) {
        return o[k];
    };
}

function kwName(args) {
    return Expr.Id(args.map(get(0)).map(get("name")).join(""));
}

function kwArgs(args) {
    return args.map(get(1));
}

function types(xs) {
    return xs.map(function(x) {
        return x[1];
    });
}

function args(xs) {
    return xs.map(function(x) {
        return x[0];
    });
}

var SirenParser = function SirenParser(source, opts) {
    AbstractGrammar.call(this, source, opts);
};

SirenParser.grammarName = "SirenParser";

SirenParser.match = AbstractGrammar.match;

SirenParser.matchAll = AbstractGrammar.matchAll;

exports.SirenParser = SirenParser;

require("util").inherits(SirenParser, AbstractGrammar);

SirenParser.prototype["space"] = function $space() {
    return this._seq(/^(\s)/);
};

SirenParser.prototype["ignored"] = function $ignored() {
    return this._atomic(function() {
        return this._rule("space", false, [], null, this["space"]);
    }) || this._atomic(function() {
        return this._rule("comment", false, [], null, this["comment"]);
    });
};

SirenParser.prototype["comment"] = function $comment() {
    var a;
    return this._rule("fromTo", false, [ "#", "\n" ], null, this["fromTo"]) && (a = this._getIntermediate(), true) && this._exec(a.slice(1));
};

SirenParser.prototype["ws"] = function $ws() {
    return this._any(function() {
        return this._atomic(function() {
            return this._rule("ignored", false, [], null, this["ignored"]);
        });
    });
};

SirenParser.prototype["sep"] = function $sep() {
    return this._match(",");
};

SirenParser.prototype["symbol"] = function $symbol() {
    return !this._atomic(function() {
        return this._atomic(function() {
            return this._rule("letter", false, [], null, this["letter"]);
        }) || this._atomic(function() {
            return this._rule("digit", false, [], null, this["digit"]);
        }) || this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        }) || this._match("_") || this._match("$") || this._match("^") || this._match("@") || this._match(";") || this._match(":") || this._match("{") || this._match("}") || this._match("(") || this._match(")") || this._match("[") || this._match("]") || this._match(".");
    }, true) && this._rule("char", false, [], null, this["char"]);
};

SirenParser.prototype["eof"] = function $eof() {
    return !this._atomic(function() {
        return this._rule("char", false, [], null, this["char"]);
    }, true);
};

SirenParser.prototype["kw"] = function $kw() {
    var xs;
    return this._skip() && (xs = this._getIntermediate(), true) && this._rule("seq", false, [ xs ], null, this["seq"]) && !this._atomic(function() {
        return this._atomic(function() {
            return this._rule("letter", false, [], null, this["letter"]);
        }) || this._atomic(function() {
            return this._rule("digit", false, [], null, this["digit"]);
        }) || this._atomic(function() {
            return this._rule("symbol", false, [], null, this["symbol"]);
        }) || this._atomic(function() {
            return this._rule("sep", false, [], null, this["sep"]);
        }) || this._match(":");
    }, true);
};

SirenParser.prototype["idStart"] = function $idStart() {
    return this._rule("letter", false, [], null, this["letter"]);
};

SirenParser.prototype["idRest"] = function $idRest() {
    return !this._atomic(function() {
        return this._rule("sep", false, [], null, this["sep"]);
    }, true) && (this._atomic(function() {
        return this._rule("letter", false, [], null, this["letter"]);
    }) || this._atomic(function() {
        return this._rule("digit", false, [], null, this["digit"]);
    }) || this._atomic(function() {
        return this._rule("symbol", false, [], null, this["symbol"]);
    }));
};

SirenParser.prototype["identifier"] = function $identifier() {
    var a;
    return this._list(function() {
        return this._rule("idStart", false, [], null, this["idStart"]) && this._any(function() {
            return this._atomic(function() {
                return this._rule("idRest", false, [], null, this["idRest"]);
            });
        });
    }, true) && (a = this._getIntermediate(), true) && isValid(a) && this._exec(Expr.Id(a));
};

SirenParser.prototype["keyword"] = function $keyword() {
    var a;
    return this._list(function() {
        return this._rule("idStart", false, [], null, this["idStart"]) && this._any(function() {
            return this._atomic(function() {
                return this._rule("idRest", false, [], null, this["idRest"]);
            });
        });
    }, true) && (a = this._getIntermediate(), true) && this._match(":") && this._exec(Expr.Id(a + ":"));
};

SirenParser.prototype["symbols"] = function $symbols() {
    var a;
    return this._list(function() {
        return this._many(function() {
            return this._atomic(function() {
                return this._rule("symbol", false, [], null, this["symbol"]);
            });
        });
    }, true) && (a = this._getIntermediate(), true) && isValid(a) && this._exec(Expr.Id(a));
};

SirenParser.prototype["argName"] = function $argName() {
    return this._atomic(function() {
        var a, b;
        return this._match("(") && this._rule("ws", false, [], null, this["ws"]) && this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && !this._atomic(function() {
            return this._match(":");
        }, true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("expr", false, [], null, this["expr"]) && (b = this._getIntermediate(), true) && this._match(")") && this._exec([ a, b ]);
    }) || this._atomic(function() {
        var a;
        return this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && !this._atomic(function() {
            return this._match(":");
        }, true) && this._exec([ a, Expr.Any() ]);
    }) || this._atomic(function() {
        return this._match("_") && this._exec([ Expr.Id("_"), Expr.Any() ]);
    });
};

SirenParser.prototype["selector"] = function $selector() {
    return this._atomic(function() {
        return this._rule("identifier", false, [], null, this["identifier"]);
    }) || this._atomic(function() {
        return this._rule("symbols", false, [], null, this["symbols"]);
    }) || this._atomic(function() {
        var xs;
        return this._many(function() {
            return this._atomic(function() {
                return this._rule("keyword", false, [], null, this["keyword"]);
            });
        }) && (xs = this._getIntermediate(), true) && this._exec(Expr.Id(xs.map(get("name")).join("")));
    });
};

SirenParser.prototype["pattern"] = function $pattern() {
    var p;
    return this._rule("kw", false, [ "define" ], null, this["kw"]) && this._rule("ws", false, [], null, this["ws"]) && (this._atomic(function() {
        return this._rule("keywordPattern", false, [], null, this["keywordPattern"]);
    }) || this._atomic(function() {
        return this._rule("binaryPattern", false, [], null, this["binaryPattern"]);
    }) || this._atomic(function() {
        return this._rule("unaryPattern", false, [], null, this["unaryPattern"]);
    }) || this._atomic(function() {
        return this._rule("varPattern", false, [], null, this["varPattern"]);
    })) && (p = this._getIntermediate(), true) && this._exec(Expr.Define(p[0], types(p[1]), args(p[1]), p[2]));
};

SirenParser.prototype["patternBody"] = function $patternBody() {
    return this._atomic(function() {
        var as;
        return this._match("=") && this._rule("ws", false, [], null, this["ws"]) && this._rule("expr", false, [], null, this["expr"]) && (as = this._getIntermediate(), true) && this._exec([ as ]);
    }) || this._atomic(function() {
        var as;
        return this._match("do") && this._rule("ws", false, [], null, this["ws"]) && this._rule("stmtList", false, [], null, this["stmtList"]) && (as = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._match("end") && this._exec(as);
    });
};

SirenParser.prototype["keywordArgs"] = function $keywordArgs() {
    var k, n;
    return this._many(function() {
        return this._atomic(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._rule("keyword", false, [], null, this["keyword"]) && (k = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("argName", false, [], null, this["argName"]) && (n = this._getIntermediate(), true) && this._exec([ k, n ]);
        });
    });
};

SirenParser.prototype["keywordPattern"] = function $keywordPattern() {
    var a, as, v;
    return this._rule("argName", false, [], null, this["argName"]) && (a = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("keywordArgs", false, [], null, this["keywordArgs"]) && (as = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("patternBody", false, [], null, this["patternBody"]) && (v = this._getIntermediate(), true) && this._exec([ kwName(as), [ a ].concat(kwArgs(as)), v ]);
};

SirenParser.prototype["unaryPattern"] = function $unaryPattern() {
    var a, b, v;
    return this._rule("argName", false, [], null, this["argName"]) && (a = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("identifier", false, [], null, this["identifier"]) && (b = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("patternBody", false, [], null, this["patternBody"]) && (v = this._getIntermediate(), true) && this._exec([ b, [ a ], v ]);
};

SirenParser.prototype["binaryPattern"] = function $binaryPattern() {
    var a, b, c, v;
    return this._rule("argName", false, [], null, this["argName"]) && (a = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("symbols", false, [], null, this["symbols"]) && (b = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("argName", false, [], null, this["argName"]) && (c = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("patternBody", false, [], null, this["patternBody"]) && (v = this._getIntermediate(), true) && this._exec([ b, [ a, c ], v ]);
};

SirenParser.prototype["varPattern"] = function $varPattern() {
    var a, v;
    return this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("space", false, [], null, this["space"]);
        });
    }) && this._rule("patternBody", false, [], null, this["patternBody"]) && (v = this._getIntermediate(), true) && this._exec([ a, [], v ]);
};

SirenParser.prototype["letStmt"] = function $letStmt() {
    var a, b;
    return this._rule("kw", false, [ "let" ], null, this["kw"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && !this._atomic(function() {
        return this._match(":");
    }, true) && this._rule("ws", false, [], null, this["ws"]) && this._match("=") && this._rule("ws", false, [], null, this["ws"]) && this._rule("expr", false, [], null, this["expr"]) && (b = this._getIntermediate(), true) && this._exec(Expr.Let(a, b));
};

SirenParser.prototype["module"] = function $module() {
    var a, b, cs;
    return this._rule("kw", false, [ "module" ], null, this["kw"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("kw", false, [ "for:" ], null, this["kw"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("identifier", false, [], null, this["identifier"]) && (b = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("kw", false, [ "where" ], null, this["kw"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("stmtList", false, [], null, this["stmtList"]) && (cs = this._getIntermediate(), true) && this._exec(Expr.Module(a, b, cs));
};

SirenParser.prototype["stmt"] = function $stmt() {
    return this._atomic(function() {
        return this._rule("letStmt", false, [], null, this["letStmt"]);
    }) || this._atomic(function() {
        return this._rule("pattern", false, [], null, this["pattern"]);
    }) || this._atomic(function() {
        return this._rule("expr", false, [], null, this["expr"]);
    });
};

SirenParser.prototype["expr"] = function $expr() {
    return this._rule("appExpr", false, [], null, this["appExpr"]);
};

SirenParser.prototype["appExpr"] = function $appExpr() {
    return this._atomic(function() {
        return this._rule("keywordExpr", false, [], null, this["keywordExpr"]);
    }) || this._atomic(function() {
        return this._rule("binaryExpr", false, [], null, this["binaryExpr"]);
    });
};

SirenParser.prototype["keywordApp"] = function $keywordApp() {
    var k, v;
    return this._rule("keyword", false, [], null, this["keyword"]) && (k = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("binaryExpr", false, [], null, this["binaryExpr"]) && (v = this._getIntermediate(), true) && this._exec([ k, v ]);
};

SirenParser.prototype["keywordExpr"] = function $keywordExpr() {
    var a, as;
    return this._rule("binaryExpr", false, [], null, this["binaryExpr"]) && (a = this._getIntermediate(), true) && this._many(function() {
        return this._atomic(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._rule("keywordApp", false, [], null, this["keywordApp"]);
        });
    }) && (as = this._getIntermediate(), true) && this._exec(Expr.Apply(kwName(as), [ a ].concat(kwArgs(as))));
};

SirenParser.prototype["binaryExpr"] = function $binaryExpr() {
    return this._atomic(function() {
        var a, s, b;
        return this._rule("binaryExpr", false, [], null, this["binaryExpr"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("symbols", false, [], null, this["symbols"]) && (s = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("unaryExpr", false, [], null, this["unaryExpr"]) && (b = this._getIntermediate(), true) && this._exec(Expr.Apply(s, [ a, b ]));
    }) || this._atomic(function() {
        return this._rule("unaryExpr", false, [], null, this["unaryExpr"]);
    });
};

SirenParser.prototype["unaryExpr"] = function $unaryExpr() {
    return this._atomic(function() {
        var a, i;
        return this._rule("unaryExpr", false, [], null, this["unaryExpr"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("identifier", false, [], null, this["identifier"]) && (i = this._getIntermediate(), true) && !this._atomic(function() {
            return this._match(":");
        }, true) && this._exec(Expr.Apply(i, [ a ]));
    }) || this._atomic(function() {
        var a, v;
        return this._rule("unaryExpr", false, [], null, this["unaryExpr"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("block", false, [], null, this["block"]) && (v = this._getIntermediate(), true) && this._exec(Expr.Clone(a, v));
    }) || this._atomic(function() {
        return this._rule("primaryExpr", false, [], null, this["primaryExpr"]);
    });
};

SirenParser.prototype["primaryExpr"] = function $primaryExpr() {
    return this._atomic(function() {
        return this._rule("value", false, [], null, this["value"]);
    }) || this._atomic(function() {
        var a;
        return this._rule("identifier", false, [], null, this["identifier"]) && (a = this._getIntermediate(), true) && !this._atomic(function() {
            return this._match(":");
        }, true) && this._exec(Expr.Apply(a, []));
    }) || this._atomic(function() {
        var a, as;
        return this._rule("keywordApp", false, [], null, this["keywordApp"]) && (a = this._getIntermediate(), true) && this._any(function() {
            return this._atomic(function() {
                return this._rule("ws", false, [], null, this["ws"]) && this._rule("keywordApp", false, [], null, this["keywordApp"]);
            });
        }) && (as = this._getIntermediate(), true) && this._exec(Expr.Apply(kwName(as), [ a ].concat(kwArgs(as))));
    }) || this._atomic(function() {
        var a;
        return this._match("(") && this._rule("ws", false, [], null, this["ws"]) && this._rule("expr", false, [], null, this["expr"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._match(")") && this._exec(a);
    });
};

SirenParser.prototype["exprList"] = function $exprList() {
    return this._atomic(function() {
        var a, as;
        return this._rule("expr", false, [], null, this["expr"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".") && this._rule("ws", false, [], null, this["ws"]) && this._rule("exprList", false, [], null, this["exprList"]);
        }) && (as = this._getIntermediate(), true) && this._exec([ a ].concat(as || []));
    }) || this._atomic(function() {
        var a;
        return this._rule("expr", false, [], null, this["expr"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".");
        }) && this._exec([ a ]);
    });
};

SirenParser.prototype["stmtList"] = function $stmtList() {
    return this._atomic(function() {
        var a, as;
        return this._rule("stmt", false, [], null, this["stmt"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".") && this._rule("ws", false, [], null, this["ws"]) && this._rule("stmtList", false, [], null, this["stmtList"]);
        }) && (as = this._getIntermediate(), true) && this._exec([ a ].concat(as || []));
    }) || this._atomic(function() {
        var a;
        return this._rule("stmt", false, [], null, this["stmt"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".");
        }) && this._exec([ a ]);
    });
};

SirenParser.prototype["blockStmt"] = function $blockStmt() {
    return this._atomic(function() {
        return this._rule("stmt", false, [], null, this["stmt"]);
    }) || this._atomic(function() {
        var a;
        return this._match("^") && this._rule("ws", false, [], null, this["ws"]) && this._rule("expr", false, [], null, this["expr"]) && (a = this._getIntermediate(), true) && this._exec(Expr.Return(a));
    });
};

SirenParser.prototype["blockStmtList"] = function $blockStmtList() {
    return this._atomic(function() {
        var a, as;
        return this._rule("blockStmt", false, [], null, this["blockStmt"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".") && this._rule("ws", false, [], null, this["ws"]) && this._rule("blockStmtList", false, [], null, this["blockStmtList"]);
        }) && (as = this._getIntermediate(), true) && this._exec([ a ].concat(as || []));
    }) || this._atomic(function() {
        var a;
        return this._rule("blockStmt", false, [], null, this["blockStmt"]) && (a = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._match(".");
        }) && this._exec([ a ]);
    });
};

SirenParser.prototype["value"] = function $value() {
    return this._atomic(function() {
        return this._rule("number", false, [], null, this["number"]);
    }) || this._atomic(function() {
        return this._rule("string", false, [], null, this["string"]);
    }) || this._atomic(function() {
        return this._rule("lambda", false, [], null, this["lambda"]);
    });
};

SirenParser.prototype["octDigit"] = function $octDigit() {
    return this._seq(/^([0-7_])/);
};

SirenParser.prototype["hexDigit"] = function $hexDigit() {
    return this._seq(/^([0-9a-fA-F_])/);
};

SirenParser.prototype["binDigit"] = function $binDigit() {
    return this._match("0") || this._match("1") || this._match("_");
};

SirenParser.prototype["digits"] = function $digits() {
    var as;
    return this._many(function() {
        return this._atomic(function() {
            return this._atomic(function() {
                return this._rule("digit", false, [], null, this["digit"]);
            }) || this._match("_");
        });
    }) && (as = this._getIntermediate(), true) && this._exec(Number(as.join("").replace(/_/g, "")));
};

SirenParser.prototype["number"] = function $number() {
    var s;
    return this._optional(function() {
        return this._match("-");
    }) && (s = this._getIntermediate(), true) && (this._atomic(function() {
        var a, b, c;
        return this._rule("digits", false, [], null, this["digits"]) && (a = this._getIntermediate(), true) && this._match(".") && this._rule("digits", false, [], null, this["digits"]) && (b = this._getIntermediate(), true) && this._optional(function() {
            return this._rule("exponent", false, [], null, this["exponent"]);
        }) && (c = this._getIntermediate(), true) && this._exec(Expr.Number(+((s || "+") + a + "." + b + (c || 0))));
    }) || this._atomic(function() {
        var a;
        return this._rule("digits", false, [], null, this["digits"]) && (a = this._getIntermediate(), true) && this._exec(Expr.Number(+((s || "+") + a)));
    }));
};

SirenParser.prototype["sign"] = function $sign() {
    return this._match("+") || this._match("-");
};

SirenParser.prototype["exponent"] = function $exponent() {
    var s, d;
    return (this._match("e") || this._match("E")) && this._optional(function() {
        return this._rule("sign", false, [], null, this["sign"]);
    }) && (s = this._getIntermediate(), true) && this._rule("digits", false, [], null, this["digits"]) && (d = this._getIntermediate(), true) && this._exec(s + d);
};

SirenParser.prototype["stringEscape"] = function $stringEscape() {
    return this._match("\\") && (this._atomic(function() {
        return this._match("b") && this._exec("\b");
    }) || this._atomic(function() {
        return this._match("f") && this._exec("\f");
    }) || this._atomic(function() {
        return this._match("n") && this._exec("\n");
    }) || this._atomic(function() {
        return this._match("r") && this._exec("\r");
    }) || this._atomic(function() {
        return this._match("t") && this._exec("	");
    }) || this._atomic(function() {
        return this._rule("char", false, [], null, this["char"]);
    }));
};

SirenParser.prototype["stringChar"] = function $stringChar() {
    var a;
    return (this._atomic(function() {
        return this._rule("stringEscape", false, [], null, this["stringEscape"]);
    }) || this._atomic(function() {
        return !this._atomic(function() {
            return this._rule("seq", false, [ '"' ], null, this["seq"]);
        }, true) && this._rule("char", false, [], null, this["char"]);
    })) && (a = this._getIntermediate(), true) && this._exec(a);
};

SirenParser.prototype["unescapableChars"] = function $unescapableChars() {
    return !this._atomic(function() {
        return this._rule("seq", false, [ '"""' ], null, this["seq"]);
    }, true) && this._rule("char", false, [], null, this["char"]);
};

SirenParser.prototype["string"] = function $string() {
    return this._atomic(function() {
        var as;
        return this._rule("seq", false, [ '"""' ], null, this["seq"]) && this._list(function() {
            return this._any(function() {
                return this._atomic(function() {
                    return this._rule("unescapableChars", false, [], null, this["unescapableChars"]);
                });
            });
        }, true) && (as = this._getIntermediate(), true) && this._rule("seq", false, [ '"""' ], null, this["seq"]) && this._exec(Expr.String(as));
    }) || this._atomic(function() {
        var as;
        return this._match('"') && this._any(function() {
            return this._atomic(function() {
                return this._rule("stringChar", false, [], null, this["stringChar"]);
            });
        }) && (as = this._getIntermediate(), true) && this._match('"') && this._exec(Expr.String(as.join("")));
    });
};

SirenParser.prototype["block"] = function $block() {
    var a;
    return this._match("{") && this._rule("ws", false, [], null, this["ws"]) && this._rule("blockStmtList", false, [], null, this["blockStmtList"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._match("}") && this._exec(Expr.Block([], a));
};

SirenParser.prototype["lambda"] = function $lambda() {
    return this._atomic(function() {
        var as, a;
        return this._match("{") && this._rule("ws", false, [], null, this["ws"]) && this._rule("arglist", false, [], null, this["arglist"]) && (as = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("seq", false, [ "=>" ], null, this["seq"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("blockStmtList", false, [], null, this["blockStmtList"]) && (a = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._match("}") && this._exec(Expr.Block(as, a));
    }) || this._atomic(function() {
        return this._rule("block", false, [], null, this["block"]);
    });
};

SirenParser.prototype["arglist"] = function $arglist() {
    var a, as;
    return this._rule("argName", false, [], null, this["argName"]) && (a = this._getIntermediate(), true) && this._any(function() {
        return this._atomic(function() {
            return this._rule("ws", false, [], null, this["ws"]) && this._rule("argName", false, [], null, this["argName"]);
        });
    }) && (as = this._getIntermediate(), true) && this._exec([ a ].concat(as));
};

SirenParser.prototype["program"] = function $program() {
    var m;
    return this._rule("ws", false, [], null, this["ws"]) && this._rule("token", true, [ ":siren/2" ], null, this["token"]) && this._rule("ws", false, [], null, this["ws"]) && this._rule("module", false, [], null, this["module"]) && (m = this._getIntermediate(), true) && this._rule("ws", false, [], null, this["ws"]) && this._rule("eof", false, [], null, this["eof"]) && this._exec(m);
};
