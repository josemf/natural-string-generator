import { Template, Modifiers, Variants } from '../src/index.js';

const templateS = (text, vars = {}, options = {}) => {
    return (new Template(text, options)).build(vars).map(ss => ss.text);
};

const templateV = (text, vars = {}, options = {}) => {    
    return (new Template(text, options)).build(vars).map(ss => ({ text: ss.text, variants: ss.variants }));
};

const templateA = (text, vars = {}, options = {}) => {
    return (new Template(text, options)).build(vars).map(ss => ({ text: ss.text, variants: ss.variants, annotations: ss.annotations }));
};

describe("Testing my-little-pony", () => { 
    
    test('Template variable interpolation', () => {
        expect(templateS("No interpolation, just simple string")).toStrictEqual([ "No interpolation, just simple string" ]);
        
        expect(templateS("A single {$var1}", { var1: "value" })).toStrictEqual([ "A single value" ]);
        expect(templateS("A single {scalar value #!_}")).toStrictEqual([ "A single scalar value #!_" ]);
        expect(templateS("Multiple {$var1} and {some scalar value} and {$var2} and {7} and {$var3}", { var1: "var1", var2: "var2", var3: "var3" })).toStrictEqual([ "Multiple var1 and some scalar value and var2 and 7 and var3" ]);

        expect(templateS("Multiple {$var1} and {some scalar value} and {$var2} and {7} and {$var3} with missing", { var2: "var2" })).toStrictEqual([ "Multiple {$var1} and some scalar value and var2 and 7 and {$var3} with missing" ]);
        expect(templateS("Multiple {$var1} and {some scalar value} and {$var2} and {7} and !{$var3} with missing required", { var2: "var2" })).toStrictEqual([]);

        expect(templateS("Nested {$var1.s1} will work at any depth {$var2.s2.x.y.z}", { var0: "zbr", var1: { s1: "value1", s2: "yey", s3: { x0: "wha?" } }, var2: { s1: "no", s2: { x: { y: { z: "value2" }} }} })).toStrictEqual([
            "Nested value1 will work at any depth value2"
        ]);

        expect(templateS("Escape \\{ tags {should} \\} probably {work yes} \\}")).toStrictEqual([ "Escape { tags should } probably work yes }"]);
    });
  
    test('Template variable interpolation: default value', () => {
        expect(templateS("Some variable {$var1} and {$var2} with some {$var3=default} value", { var2: "VAR2" })).toStrictEqual([ "Some variable {$var1} and VAR2 with some default value" ]);
        expect(templateS("Some variable {$var1} and {$var2} with some nested {$var3.x.y=default} value", { var2: "VAR2" })).toStrictEqual([ "Some variable {$var1} and VAR2 with some nested default value" ]);
        expect(templateS("Some variable {$var1} and {$var2} with some nested {$var3.x.y=defaultValue|space} with modifier", { var2: "VAR2" })).toStrictEqual([ "Some variable {$var1} and VAR2 with some nested default value with modifier" ]);                
    });
    
    test('Multiple template expansions', () => {

        expect(templateS("One [expansion] is dumb but works")).toStrictEqual([ "One expansion is dumb but works" ]);
        expect(templateS("Two [expansion1|expansion2] is better")).toStrictEqual([ "Two expansion1 is better", "Two expansion2 is better" ]);
        expect(templateS("Two [ expansion1  | expansion2  ] is better")).toStrictEqual([ "Two expansion1 is better", "Two expansion2 is better" ]);
        expect(templateS("The more [expansion1|$var1|expansion2|$var2] the merrier, [yup|no]?", { var1: 'var1 value', var2: 'var2 stuff' })).toStrictEqual([
            "The more expansion1 the merrier, yup?",
            "The more expansion1 the merrier, no?",            
            "The more var1 value the merrier, yup?",
            "The more var1 value the merrier, no?",            
            "The more expansion2 the merrier, yup?",
            "The more expansion2 the merrier, no?",            
            "The more var2 stuff the merrier, yup?",
            "The more var2 stuff the merrier, no?"            
        ]);
        expect(templateS("The more [expansion1|$var1|expansion2|$var2] the merrier, [yup|no]?", { var1: 'var1 value' })).toStrictEqual([
            "The more expansion1 the merrier, yup?",
            "The more expansion1 the merrier, no?",            
            "The more var1 value the merrier, yup?",
            "The more var1 value the merrier, no?",            
            "The more expansion2 the merrier, yup?",
            "The more expansion2 the merrier, no?",            
            "The more {$var2} the merrier, yup?",
            "The more {$var2} the merrier, no?"            
        ]);        

        expect(templateS("Expansions [expansion1|exp2\\] can \\] be escaped, \\[yup|no]?")).toStrictEqual([
            "Expansions [expansion1|exp2] can ] be escaped, [yup|no]?"
        ]);
        
        expect(templateS("And [expansion|alternatives|xpto\\|zbr] will also escape")).toStrictEqual([
            "And expansion will also escape",
            "And alternatives will also escape",
            "And xpto|zbr will also escape",            
        ]);

        expect(templateS("[Start|Begin] phrase works")).toStrictEqual([ "Start phrase works", "Begin phrase works" ]);
        
        expect(templateS("Expanding arrays {$arr1} also works", { arr1: [ "arr1 1", "arr1 2", "arr1 3"] })).toStrictEqual([ "Expanding arrays arr1 1 also works", "Expanding arrays arr1 2 also works", "Expanding arrays arr1 3 also works" ]);
        
        expect(templateS("Expanding arrays {$arr1} also works and {$arr2} nests well", { arr1: [ "arr1 1", "arr1 2", "arr1 3"], arr2: ["arr2 1", "arr2 2"] })).toStrictEqual([
            "Expanding arrays arr1 1 also works and arr2 1 nests well",
            "Expanding arrays arr1 1 also works and arr2 2 nests well",
            "Expanding arrays arr1 2 also works and arr2 1 nests well",
            "Expanding arrays arr1 2 also works and arr2 2 nests well",
            "Expanding arrays arr1 3 also works and arr2 1 nests well",
            "Expanding arrays arr1 3 also works and arr2 2 nests well"                        
        ]);

        expect(templateS("Expanding arrays {$arr1} also {$var1} [works|really works] {literal} and {$arr2} nests {$var2} well", { arr1: [ "arr1 1", "arr1 2", "arr1 3"], arr2: ["arr2 1", "arr2 2"], var1: "var1 value", var2: "var2 stuff" })).toStrictEqual([
            "Expanding arrays arr1 1 also var1 value works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 1 also var1 value works literal and arr2 2 nests var2 stuff well",
            "Expanding arrays arr1 2 also var1 value works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 2 also var1 value works literal and arr2 2 nests var2 stuff well",
            "Expanding arrays arr1 3 also var1 value works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 3 also var1 value works literal and arr2 2 nests var2 stuff well",

            "Expanding arrays arr1 1 also var1 value really works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 1 also var1 value really works literal and arr2 2 nests var2 stuff well",
            "Expanding arrays arr1 2 also var1 value really works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 2 also var1 value really works literal and arr2 2 nests var2 stuff well",
            "Expanding arrays arr1 3 also var1 value really works literal and arr2 1 nests var2 stuff well",
            "Expanding arrays arr1 3 also var1 value really works literal and arr2 2 nests var2 stuff well",                                    
        ]);

        expect(templateS("A repeating nested {$var1.var2} variable", { var1: { var2: ["a1", "a2", "a3"] }})).toStrictEqual([
            "A repeating nested a1 variable",
            "A repeating nested a2 variable",
            "A repeating nested a3 variable"            
        ]);
        
    });

    test('Template modifier methods: chaining', () => {

        expect(templateS("This have {plural|plural}")).toStrictEqual([ "This have plurals" ]);
        expect(templateS("This have {$animal|plural}", { animal: "cat" })).toStrictEqual([ "This have cats" ]);
        expect(templateS("This have a {$animal|plural|singular}", { animal: "cat" })).toStrictEqual([ "This have a cat" ]);

        expect(templateS("Snake_case to {space_case|space}")).toStrictEqual([ "Snake_case to space case" ]);
        expect(templateS("And camelCase to {$var1|space}", { var1: "spaceCase"})).toStrictEqual([ "And camelCase to space case" ]);                
    });

    test('Template modifier methods: shorthands', () => {
        expect(templateS("This have {plural}s")).toStrictEqual([ "This have plurals" ]);
        expect(templateS("This have {$animal}s", { animal: "cat" })).toStrictEqual([ "This have cats" ]);
        expect(templateS("Snake_case to {space_case}_")).toStrictEqual([ "Snake_case to space case" ]);
        expect(templateS("Snake_case to {space_case}s_")).toStrictEqual([ "Snake_case to space cases" ]);
        expect(templateS("Snake_case to {space_case}_s")).toStrictEqual([ "Snake_case to space cases" ]);
        expect(templateS("Snake_case to {space_case|singular}s_")).toStrictEqual([ "Snake_case to space cases" ]);
        expect(templateS("Snake_case to {space_case|singular}s_x.")).toStrictEqual([ "Snake_case to space casesx." ]);
        expect(templateS("Snake_case to {space_case|singular}s\\_x.")).toStrictEqual([ "Snake_case to space_cases_x." ]);                
    });
    
    test('Template modifier methods: resolve', () => {
        Modifiers.resolve(`${__dirname}/template_modifiers`);

        expect(templateS("This have {plural|plural}x")).toStrictEqual([ "This have XpluralsX" ]);
        expect(templateS("This have {plural|plural|ymod}x")).toStrictEqual([ "This have XYpluralsYX" ]);                
    });

    test('Template modifier methods: loaded', () => {
        expect(Modifiers.loaded()['plural']).not.toBeUndefined();
        expect(Modifiers.loaded()['space']).not.toBeUndefined();        
    });

    test('Template conditionals', () => {        
        expect(templateS("Simple if is ?{$var1}{true}", {var1: true})).toStrictEqual([ "Simple if is true" ]);
        expect(templateS("Simple if is ?{$var1}{true} false", {var1: false})).toStrictEqual([ "Simple if is false" ]);
        expect(templateS("If with conditional modifiers ?{$var1|eq:works}{also works}", {var1: "works"})).toStrictEqual([ "If with conditional modifiers also works" ]);
        expect(templateS("And it supports ?{$var1|includes:works|includes:tastes}{$cond} statements", {var1: [ "feels", "tastes", "dances"], cond: "OR" })).toStrictEqual([ "And it supports OR statements" ]);
        expect(templateS("And it supports ?{$var1|includes:works&includes:tastes}{$cond} statements", {var1: [ "feels", "tastes", "works"], cond: "AND" })).toStrictEqual([ "And it supports AND statements" ]);
        expect(templateS("And it supports ?{$var1|includes:works&includes:tastes}{$cond} statements", {var1: [ "feels", "tastes", "dances"], cond: "AND" })).toStrictEqual([ "And it supports statements" ]);
        expect(templateS("And it supports ?{$var1|includes:works&includes:tastes|includes:dances}{$cond} statements", {var1: [ "feels", "tastes", "dances"], cond: "MIXED" })).toStrictEqual([ "And it supports MIXED statements" ]);        
        expect(templateS("If conditions ?{$var1}{supportsModifier|space|plural}", { var1: true })).toStrictEqual([ "If conditions supports modifiers" ]);
        expect(templateS("If conditions supports ?{$var1}{$ifText}{$elseText} evaluations with declared else condition", { var1: true, ifText: "IF", elseText: "ELSE" })).toStrictEqual([ "If conditions supports IF evaluations with declared else condition" ]);
        expect(templateS("If conditions supports ?{$var1}{$ifText}{$elseText} evaluations with declared else condition", { var1: false, ifText: "IF", elseText: "ELSE" })).toStrictEqual([ "If conditions supports ELSE evaluations with declared else condition" ]);        
        expect(templateS("[This is|Those are] ?{$var1|eq:yes}{a more}{less} complicated ?{$var2|eq:yes}{example}{$else1}, ?{do|eq:do}{do you} read?", { var1: "yes", var2: "no", else1: "sample" }))
            .toStrictEqual([
                "This is a more complicated sample, do you read?",
                "Those are a more complicated sample, do you read?",                
            ]);
    });

    test('Template variants', () => {

        Variants.add({
            cheer: {
                simple: "yey!",
                very: "amazingly"
            },

            negate: {
                works: [ "doesn't work", "doesn't actually works" ],
                functions: [ "doesn't function", "doesn't actually functions" ],
                very: "not so"
            },

            expects: {
                works: [ "is expected to work"]
            },            
        });

        expect(Object.keys(Variants.loaded()).includes("cheer")).toBe(true);
        
        expect(templateV("#Simple# variant works")).toStrictEqual([
            { text: "Simple variant works", variants: [] },
            { text: "Yey! variant works", variants: [ "cheer" ] }            
        ]);

        expect(templateV("#Works# here")).toStrictEqual([
            { text: "Works here", variants: [] },
            { text: "Doesn't work here", variants: [ "negate" ] },
            { text: "Doesn't actually works here", variants: [ "negate" ] },
            { text: "Is expected to work here", variants: [ "expects" ] }                                    
        ]);        

        expect(templateV("Simple variant #works#")).toStrictEqual([
            { text: "Simple variant works", variants: [] },
            { text: "Simple variant doesn't work", variants: [ "negate" ] },
            { text: "Simple variant doesn't actually works", variants: [ "negate" ] },            
            { text: "Simple variant is expected to work", variants: [ "expects" ] },                        
        ]);

        expect(templateV("Simple variant #functions#")).toStrictEqual([
            { text: "Simple variant functions", variants: [] },
            { text: "Simple variant doesn't function", variants: [ "negate" ] },
            { text: "Simple variant doesn't actually functions", variants: [ "negate" ] }                       
        ]);        

        expect(templateV("Complex variant #works# to generate text #very# #well#")).toStrictEqual([
            { text: "Complex variant works to generate text very well", variants: [] },
            { text: "Complex variant works to generate text amazingly well", variants: [ "cheer" ] },
            { text: "Complex variant works to generate text not so well", variants: [ "negate" ] },
            { text: "Complex variant doesn't work to generate text very well", variants: [ "negate" ] },
            { text: "Complex variant doesn't work to generate text amazingly well", variants: [ "negate", "cheer" ] },
            { text: "Complex variant doesn't work to generate text not so well", variants: [ "negate", "negate" ] },            
            { text: "Complex variant doesn't actually works to generate text very well", variants: [ "negate" ] },
            { text: "Complex variant doesn't actually works to generate text amazingly well", variants: [ "negate", "cheer" ] },
            { text: "Complex variant doesn't actually works to generate text not so well", variants: [ "negate", "negate" ] },            
            { text: "Complex variant is expected to work to generate text very well", variants: [ "expects" ] },
            { text: "Complex variant is expected to work to generate text amazingly well", variants: [ "expects", "cheer" ] },
            { text: "Complex variant is expected to work to generate text not so well", variants: [ "expects", "negate" ] },            
        ]);
        
        expect(templateV("Complex variant #works# to generate text #very# #well#", {}, { variants: { complacent: { well: "fine" }} })).toStrictEqual([
            { text: "Complex variant works to generate text very well", variants: [] },
            { text: "Complex variant works to generate text very fine", variants: [ "complacent" ] },            
            { text: "Complex variant works to generate text amazingly well", variants: [ "cheer" ] },
            { text: "Complex variant works to generate text amazingly fine", variants: [ "cheer", "complacent" ] },            
            { text: "Complex variant works to generate text not so well", variants: [ "negate" ] },
            { text: "Complex variant works to generate text not so fine", variants: [ "negate", "complacent" ] },            
            { text: "Complex variant doesn't work to generate text very well", variants: [ "negate" ] },
            { text: "Complex variant doesn't work to generate text very fine", variants: [ "negate", "complacent" ] },            
            { text: "Complex variant doesn't work to generate text amazingly well", variants: [ "negate", "cheer" ] },
            { text: "Complex variant doesn't work to generate text amazingly fine", variants: [ "negate", "cheer", "complacent" ] },            
            { text: "Complex variant doesn't work to generate text not so well", variants: [ "negate", "negate" ] },
            { text: "Complex variant doesn't work to generate text not so fine", variants: [ "negate", "negate", "complacent" ] },                        
            { text: "Complex variant doesn't actually works to generate text very well", variants: [ "negate" ] },
            { text: "Complex variant doesn't actually works to generate text very fine", variants: [ "negate", "complacent" ] },            
            { text: "Complex variant doesn't actually works to generate text amazingly well", variants: [ "negate", "cheer" ] },
            { text: "Complex variant doesn't actually works to generate text amazingly fine", variants: [ "negate", "cheer", "complacent" ] },            
            { text: "Complex variant doesn't actually works to generate text not so well", variants: [ "negate", "negate" ] },
            { text: "Complex variant doesn't actually works to generate text not so fine", variants: [ "negate", "negate", "complacent" ] },                        
            { text: "Complex variant is expected to work to generate text very well", variants: [ "expects" ] },
            { text: "Complex variant is expected to work to generate text very fine", variants: [ "expects", "complacent" ] },            
            { text: "Complex variant is expected to work to generate text amazingly well", variants: [ "expects", "cheer" ] },
            { text: "Complex variant is expected to work to generate text amazingly fine", variants: [ "expects", "cheer", "complacent" ] },            
            { text: "Complex variant is expected to work to generate text not so well", variants: [ "expects", "negate" ] },
            { text: "Complex variant is expected to work to generate text not so fine", variants: [ "expects", "negate", "complacent" ] },                        
        ]);                       
    });

    test('Template annotations', () => {
        
        expect(templateA("Annotations @annotation #are# [nice|cool] and get extracted @extracted from the {$var1}", { var1: "output"}, { variants: { negate: { are: "aren't" }}})).toStrictEqual([
            { text: "Annotations are nice and get extracted from the output", variants: [], annotations: ["annotation", "extracted"] },
            { text: "Annotations aren't nice and get extracted from the output", variants: ["negate"], annotations: ["annotation", "extracted"] },            
            { text: "Annotations are cool and get extracted from the output", variants: [], annotations: ["annotation", "extracted"] },
            { text: "Annotations aren't cool and get extracted from the output", variants: ["negate"], annotations: ["annotation", "extracted"] }                        
        ]);

        expect(templateA("Annotations \\@annotation #are# [nice|cool] and get extracted @extracted from the {$var1}", { var1: "output"}, { variants: { negate: { are: "aren't" }}})).toStrictEqual([
            { text: "Annotations @annotation are nice and get extracted from the output", variants: [], annotations: ["extracted"] },
            { text: "Annotations @annotation aren't nice and get extracted from the output", variants: ["negate"], annotations: ["extracted"] },            
            { text: "Annotations @annotation are cool and get extracted from the output", variants: [], annotations: ["extracted"] },
            { text: "Annotations @annotation aren't cool and get extracted from the output", variants: ["negate"], annotations: ["extracted"] }                        
        ]);        
    });


    test('Modifier functions', () => {
        expect(templateS("Plural {plural}s works {plural|plural} works {plurals|plural:1} 1 works")).toStrictEqual([ "Plural plurals works plurals works plural 1 works" ]);
        const count = 5;
        expect(templateS("Plural {plural}s works {plural|plural} works {plurals|plural:$count} {$count} works", {count})).toStrictEqual([ "Plural plurals works plurals works plurals 5 works" ]);        
        expect(templateS("Singular {singulars|singular} works")).toStrictEqual([ "Singular singular works" ]);
        expect(templateS("{camelCase|space} and {snake_case}_ and {SentenceCase}_ and {slug-case|space} works")).toStrictEqual([ "camel case and snake case and sentence case and slug case works" ]);

        expect(templateS("{upcaseFirstLetter|capitalize:true} and not {capitalize|capitalize:true} but works {anyway|capitalize} and {whatever}C"))
            .toStrictEqual([ "UpcaseFirstLetter and not capitalize but works Anyway and Whatever" ])

        expect(templateS("{LOWeRcaSe|lowercase} and not {capitaliZe}l but works {anyway|lowercase} and {WhaTEver|lowercase}C"))
            .toStrictEqual([ "lowercase and not capitalize but works anyway and Whatever" ])        

        const joinData = [ "asd", "xpto", "zbr" ];

        expect(templateS("Will do a join {$joinData|join:,}", { joinData })).toStrictEqual(["Will do a join asd, xpto and zbr"])
        expect(templateS("Will do a join {$joinData|join:,  }", { joinData })).toStrictEqual(["Will do a join asd, xpto and zbr"])        
        expect(templateS("Will do a join {$joinData|join: and }", { joinData })).toStrictEqual(["Will do a join asd and xpto and zbr"])
        
        // Using plural and singular in conditionals

        expect(templateS("?{$var1|plural}{Yes}{Not}", { var1: "car" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|plural}{Yes}{Not}", { var1: "cars" })).toStrictEqual([ "Yes" ]);                
        expect(templateS("?{$var1|plural}{Yes}{Not}", { var1: "foot" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|plural}{Yes}{Not}", { var1: "feet" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|singular}{Yes}{Not}", { var1: "car" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|singular}{Yes}{Not}", { var1: "cars" })).toStrictEqual([ "Not" ]);                
        expect(templateS("?{$var1|singular}{Yes}{Not}", { var1: "foot" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|singular}{Yes}{Not}", { var1: "feet" })).toStrictEqual([ "Not" ]);                

        // Other conditionals
        
        expect(templateS("?{$var1|includes:d}{Includes}{Not}", { var1: [ "a", "b", "c", "d"] })).toStrictEqual([ "Includes" ]);
        expect(templateS("?{$var1|includes:d}{Includes}{Not}", { var1: [ "a", "b", "c", ] })).toStrictEqual([ "Not" ]);        
        expect(templateS("?{$var1|includes:asd}{Includes}{Not}", { var1: "xptoasdx" })).toStrictEqual([ "Includes" ]);
        expect(templateS("?{$var1|includes:asd}{Includes}{Not}", { var1: "xptodassdz" })).toStrictEqual([ "Not" ]);
        
        expect(templateS("?{$var1|eq:asd}{Yes}{Not}", { var1: "asd" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:asd}{Yes}{Not}", { var1: "asdx" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|eq:true}{Yes}{Not}", { var1: true })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:yes}{Yes}{Not}", { var1: true })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:false}{Yes}{Not}", { var1: false })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:no}{Yes}{Not}", { var1: false })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:}{Yes}{Not}", { var1: false })).toStrictEqual([ "Yes" ]);                        
        expect(templateS("?{$var1|eq:true}{Yes}{Not}", { var1: false })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|eq:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|eq:888}{Yes}{Not}", { var1: 889 })).toStrictEqual([ "Not" ]);

        expect(templateS("?{$var1|neq:asd}{Yes}{Not}", { var1: "asd" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:asd}{Yes}{Not}", { var1: "asdx" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|neq:true}{Yes}{Not}", { var1: true })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:yes}{Yes}{Not}", { var1: true })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:false}{Yes}{Not}", { var1: false })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:no}{Yes}{Not}", { var1: false })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:}{Yes}{Not}", { var1: false })).toStrictEqual([ "Not" ]);                        
        expect(templateS("?{$var1|neq:true}{Yes}{Not}", { var1: false })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|neq:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|neq:888}{Yes}{Not}", { var1: 889 })).toStrictEqual([ "Yes" ]);

        expect(templateS("?{$var1|gt:asd}{Yes}{Not}", { var1: "asd" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|gt:asd}{Yes}{Not}", { var1: "asdx" })).toStrictEqual([ "Yes" ]);        
        expect(templateS("?{$var1|gt:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|gt:888}{Yes}{Not}", { var1: 889 })).toStrictEqual([ "Yes" ]);        
        expect(templateS("?{$var1|gt:888|eq:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|lt:asd}{Yes}{Not}", { var1: "asd" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|lt:asd}{Yes}{Not}", { var1: "0sd" })).toStrictEqual([ "Yes" ]);        
        expect(templateS("?{$var1|lt:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|lt:888}{Yes}{Not}", { var1: 887 })).toStrictEqual([ "Yes" ]);        
        expect(templateS("?{$var1|lt:888|eq:888}{Yes}{Not}", { var1: 888 })).toStrictEqual([ "Yes" ]);        

        expect(templateS("?{$var1|match:xyz}{Yes}{Not}", { var1: "xxzyzzz" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|match:xyz}{Yes}{Not}", { var1: "aabbdxYzzz" })).toStrictEqual([ "Not" ]);
        expect(templateS("?{$var1|match:xyz}{Yes}{Not}", { var1: "aabbdxyzzz" })).toStrictEqual([ "Yes" ]);
        expect(templateS("?{$var1|match:xyz:i}{Yes}{Not}", { var1: "aabbdxYzzz" })).toStrictEqual([ "Yes" ]);
    });

    test("Assorted error situations", () => {

        expect(() => templateS("A {plural|plural:x} fails if arg is not a number")).toThrow();

        expect(() => templateS("Unexisting {text|coolmod404} fails if modifier is not defined")).toThrow();

        expect(() => templateS("Unexisting ?{text|coolmod404}{Ok}{Nok} fails if modifier is not defined")).toThrow();                

        expect(() => templateV("It is required a #good# variant setup", {}, { variants: { positive: { good: /whatawhat/ } } })).toThrow();

        expect(() => Modifiers.add("modmod", "It is required a name, description and callback function", false)).toThrow();

        expect(() => Modifiers.add("modmod", "Shorthands take only 1 character", () => ({}), "xz")).toThrow();        
    });

    test('Testing interpolation with `with` API', () => {
        const template = new Template();

        template.with([
            'this is one frase',
            'this is the second phrase',
            'and a third one'
        ]);
        
        expect(template.text()).toStrictEqual([
            'this is one frase',
            'this is the second phrase',
            'and a third one'
        ])

        const template2 = new Template();

        template2.with([
            'this is one frase',
            'this is the second phrase',
            'and a third one'
        ], [
            'combined with one',
            'combined with other'
        ]);
        
        expect(template2.text()).toStrictEqual([
            'this is one frase combined with one',
            'this is one frase combined with other',            
            'this is the second phrase combined with one',
            'this is the second phrase combined with other',            
            'and a third one combined with one',
            'and a third one combined with other',            
        ])

        const template3 = new Template();

        template3.with([
            'this is one frase',
            'this is the second phrase',
            'and a third one'
        ], [
            'combined with one',
            '^this is solo',            
            'combined with other'
        ], [
            '^and a second solo',
            'triplebined yeah'
        ]);

        expect(template3.text()).toStrictEqual([
            'and a second solo',
            'this is one frase combined with one triplebined yeah',
            'this is solo triplebined yeah',
            'this is one frase combined with other triplebined yeah',
            'this is the second phrase combined with one triplebined yeah',                                    
            'this is the second phrase combined with other triplebined yeah',
            'and a third one combined with one triplebined yeah',                                    
            'and a third one combined with other triplebined yeah',

        ])                
    });

    test('Conditionals support variable substitution inside then an else clauses', () => {
        expect(templateS("?{$var1|eq:yes}{This was an $var2. Wasn't it?}{Not}", { var1: true, var2: "amazing outcome" })).toStrictEqual([ "This was an amazing outcome. Wasn't it?" ]);
        expect(templateS("?{$var1|neq:yes}{This was an $var2. Wasn't it?}{Not $var1}", { var1: true, var2: "amazing outcome" })).toStrictEqual([ "Not true" ]);                
    });

    test('<space>. and <space>, should remove space before the signal', () => {
        expect(templateS("This is a test with {$replacement}, that went well?{$var1|eq:yes}{yes}{ }.", { replacement: "", var1: "no" })).toStrictEqual([ "This is a test with, that went well." ]);                
    });
});
