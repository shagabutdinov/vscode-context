sentence "expression"
  = ws head:value ws tail:(ws (operatorBoolean) ws value)* ws {
    let currentAnd = [head];
    const result = [];

    const dump = () => {
      if (currentAnd.length === 1) {
        result.push(currentAnd[0]);
      } else {
        result.push({ command: 'and', args: currentAnd });
      }

      currentAnd = [];
    }

    tail.forEach((element) => {
      if (element[1] === 'or') {
        dump();
      }

      currentAnd.push(element[3]);
    });

    dump();

    if (result.length === 1) {
      return result[0];
    }

    return { command: 'or', args: result };
  }

operatorBoolean "operator" = operatorOr / operatorAnd
operatorOr "or" = "||" { return "or" }
operatorAnd "and" = "&&" { return "and" }

expression
  = left:raw
    ws operator:operator
    ws right:raw {
      return { command: operator, args: [left, right] }
    }
  / "!" ws result:raw { return { ...result, not: true } }

operator
  = operator:(o:([^a-zA-Z0-9. (){}\[\],:]+) ! {
    return (
      (o[0] === '|' && o[1] === '|') ||
      (o[0] === '&' || o[1] === '&')
    )
  }) {
    return text();
  }

call "callback"
  = callback:callHead tail:(ws "." ws callPart)* {
    return {
      ...callback,
      chain: tail.map((t) => t[3])
    }
  }

callHead
  = command:callHeadId "(" ws args:args? ws ")" { return { command, args: args || [] } }

callHeadId = ([a-zA-Z_][a-zA-Z0-9_.]+) { return text() }

callPart
  = method:callPartId args:("(" ws args? ws ")")? {
    return args ? { method, args: args[2] || [] } : { property: method }
  }

callPartId = ([a-zA-Z_][a-zA-Z0-9_]+) { return text() }

args = head:value tail:(ws value_separator ws value)* value_separator? {
    if(typeof tail === 'undefined') {
      return undefined;
    }

    return tail.reduce(function(result, element) {
      return [...result, element[3]];
    }, [head])
  }

ws "whitespace" = [ \t\n\r]*
// unquoted = value / [a-zA-Z][a-zA-Z0-9.\-_]* { return text() }

// json

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}" ws
name_separator  = ws ":" ws
value_separator = ws "," ws

// ----- 3. Values -----

raw
  = value:(
      false
      / null
      / true
      / number
      / string
    ) { return { value } }
    / call
    / object:object { return { object } }
    / array:array { return { array } }

value
  = expression
  / raw
  / '(' value:value ')' { return value; }
  / '(' sentence:sentence ')' { return sentence; }

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

// ----- 4. Objects -----

object
  = begin_object
    members:(
      head:member
      tail:(value_separator m:member { return m; })*
      {
        var result = {};

        [head].concat(tail).forEach(function(element) {
          result[element.name] = element.value;
        });

        return result;
      }
    )?
    end_object
    { return members !== null ? members: {}; }

member
  = name:object_key name_separator value:value {
      return { name: name, value: value };
    }

object_key =
  string /
  [a-zA-Z][a-zA-Z0-9]* { return text() }

// ----- 5. Arrays -----

array
  = begin_array
    values:(
      head:value
      tail:(value_separator v:value { return v; })*
      { return [head].concat(tail); }
    )?
    end_array
    { return values !== null ? values : []; }

// ----- 6. Numbers -----

number "number"
  = minus? int frac? exp? { return parseFloat(text()); }

decimal_point = "."
digit1_9 = [1-9]
e = [eE]
exp = e (minus / plus)? DIGIT+
frac = decimal_point DIGIT+
int = zero / (digit1_9 DIGIT*)
minus = "-"
plus = "+"
zero = "0"

// ----- 7. Strings -----

string "string"
  = quote chars:char* quote { return chars.join(""); }
  / single_quote chars:single_quote_char* single_quote { return chars.join(""); }
  // / [a-zA-Z][a-zA-Z0-9]* { return text() } // uncomment for naked strings

quote = '"'

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

unescaped = [^\0-\x1F\x22\x5C]

single_quote = "'"
single_quote_char
  = unescaped_single
  / escape char:("'") { return char; }

unescaped_single = [^\0-\x1F\x27\x5C]

escape = "\\"

// ----- Core ABNF Rules -----

// See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4234).
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i