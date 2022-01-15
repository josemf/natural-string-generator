<div align="center">
  <h1>Natural String Generator</h1>
  <p><b>A predicatable template based string generator.</b></p>
  <p>
      <code class="javascript">
`I [like|love] #build# {$what}`	
      </code>
    </p>
</div>

[![CI](https://github.com/josemf/natural-string-generator/workflows/Node.js%20CI/badge.svg)](https://github.com/josemf/natural-string-generator/actions)

## Contents

- [What is this](#what-is-this)
- [Getting Started](#getting-started)
- [Token interpolation](#token-interpolation)
- [Default values](#default-values)
- [String expansions](#string-expansions)
- [Modifier functions](#modifier-functions)
- [Conditionals](#conditionals)
- [Variants](#variants)
- [Annotations](#annotations)
- [Natural Language optimizations](#natural-language-optimizations)
- [License](#license)

## What is this

This library implements a string template engine that does:

* Template **token interpolation** &mdash; simply enough implements a string template language that will take some data and outputs a string by applying a template.
* **String expansions** &mdash; The template language supports expanding a template into multiple string outputs. 
* Template modifiers &mdash; Includes some **modifier functions** that support natural language generation use cases.
* Annotations and variants &mdash; Generates **metadata** with text generation so text will have semantic.
* Reasonably *tries* to keep the generated text syntactically correct.

## Getting Started

It can be added to the project using `npm` or `yarn`.

```inbash
$ yarn add natural-string-generator
$ npm install natural-string-generator
```

It exports a `Template` class. Instantiate with a template string and expand into strings by using `build(values: Object, options: Config)` or `text(values: Object, options: Config)`.

```javascript
import { Template } from 'natural-string-generator';

const template = Template(`I [like|love] to #build# {$what|join:,}`, 
                          variants: {
                          	watch: { build: [ "watch", "look into" ] } 
                          });

template.build({ what: ["this", "that"] });

/*
	[
		{ text: "I like to build this and that", variants: [ ] },
		{ text: "I love to build this and that", variants: [ ] },
		{ text: "I like to watch this and that", variants: [ "watch" ] },
		{ text: "I love to watch this and that", variants: [ "watch" ] },	
		{ text: "I like to look into this and that", variants: [ "watch" ] },
		{ text: "I love to look into this and that", variants: [ "watch" ] },        
	]
*/
```

Read more to learn about all the features.

## Token interpolation

Values are prefixed with `$`. Whatever is put in templates that is not a variable is considered a scalar.

```javascript
(new Template('This is a {$variable}. You must supply a value')).build({ variable: "value" });
(new Template('This is a {scalar value}')).build();
```

Using scalars insider templates are most useful when providing function modifiers.

Sometimes is useful to require a value and prevent string generation if we don't have a value for a template variable. We prefix with `!`.

```javascript
(new Template('This is only generated if we have !{$variable}')).build();
// []
```

Interpolation works with nested variables in objects at any level.

## Default Values

Template variables have a syntax for default values when a variable value is missing or undefined.

```javascript
(new Template('This is a {$variable=Default value!}. It have a default value')).build({  });
// [ { string: "This is a Default value!. It have a default value" } ]
```

It works on nested variables and the default value is send to any modifier function if defined.

## String expansions

Interpolation might result in expanding a string template into multiple strings that share some text structure but include a defined set of variants. When the variants are known before and we use the `[var1|var2|...]` syntax. It actually accepts template variables as well.

```javascript
(new Template('I like [dogs|cats|icecream|$variable]')).build({ variable: 'metal' })
```

Alternatively we might use the interpolation syntax with array values and without function modifiers.

```javascript
(new Template('I like {$stuff}')).build({ stuff: [ 'dogs', 'cats', 'icecream', 'metal' ] })
```

Both examples will result in:

```javascript
[ 
    { "string": "I like cats" },
    { "string": "I like dogs" },
    { "string": "I like icecreams" },
    { "string": "I like metal" }
]
```

## Modifier functions

The template interpolation syntax support modifier functions. Those might be "piped" meaning they are applied to whatever is the template variable or scalar in the template or as a result of a previous modifier function.

```javascript
(new Template('This cat have {$count|numberToText} {live|plural:$count|uppcase}')).build({ count: 7 })
```

Modifier functions accept arguments. The overall syntax is `{template variable|modifier1|modifier2:var1:var2|modifier3:otherVar}`. They are applied in order, so in this example `modifier1` is applied using input "template variable", whatever returns is feed as input to `modifier2` that also accepts `var1` and `var2` arguments, and so on.

A few "useful" modifiers are provided by the library:

| name       | arguments         | short hand | description                                                  |
| ---------- | ----------------- | ---------- | ------------------------------------------------------------ |
| plural     | count             | s          | Transform a template variable in the plural form based on a count argument |
| singular   |                   |            | Transform a template variable text in the corresponding singular form |
| space      |                   | _          | Transforms snake case, camel case, to spaced text            |
| capitalize | onlyIfFirstLetter | C          | Capitalizes the first letter of a token. If argument is used only capitalizes if first word of a paragraph |
| join       | separator         |            | Joins arrays into strings using a separator. If the separator is `,` it will use `and` as the separator for the last item. |
| includes   | value             |            | Useful in conditionals, this check if some supplied array includes some value. If it is a string it will search for a substring. |
| eq         | value             |            | Useful in conditionals, this check if the template variable is equal to some value |
| neq        | value             |            | Useful in conditionals, this check if the template variable is not equal to some value |
| gt         | value             |            | Useful in conditionals, this check if the template variable is greater than some value |
| lt         | value             |            | Useful in conditionals, this check if the template variable is lower than some value |
| match      | regexp            |            | Useful in conditionals, this check if the template variable matches some regexp pattern |

A short hand form might be provided for those modifiers that don't have arguments or optionally require arguments. Sometimes this makes templates less cluttered. Shorthands can only have one letter.

```javascript
(new Template('This {$being}_ have {$count|numberToText} {leg}s')).build({ being: 'tiger_cat', count: 4 })
```

Modifiers can be added "globally" or specifically to a template.

```javascript
import { Template, Modifiers } from 'my-little-pony';
import { module } from './n2t'

Modifiers.add("numberToText", "Transform a numeric value to it's text representation",  module, "t");

(new Template('This {$being}_ have {$count}t {leg}s')).build({ being: 'tiger_cat', count: 4 })

// Loads from a file module
// Modules export `name`, `description`, `module` and `shorthand`
Modifiers.module('./mod_file.js')

// Loads all modifiers from some path
Modifiers.resolve('/path/to/modifiers')

// List all existing modifiers
Modifiers.list();
```

## Conditionals

I implemented a very simple conditional syntax based on modifier functions. The idea is to support if then else logic without making templates complex. Sophisticated conditions logic might be implemented by a modifier.

```javascript
(new Template('Hey! ?{$animal|isAnimal:cat}{I see a cat} ?{$animal|isAnimal:dog}{I see a doggo}')).build({ animal: 'syberian cat' })
```

If else:

```javascript
(new Template('Look! I can see ?{$count|gt:1}{several}{no} {$animal|plural:$count}. Can you see? ')).build({ animal: 'syberian cat' })
```

The conditions prepends a template variable definition or two, for an else condition, which is optional.

`?{$var|modifierFun:arg1:arg2:etc&modifierFun2}{thenDef}{elseDef}`. 

Modifier functions are used to evaluate the if then else conditions. Empty (string, null, undefined) is evaluated as false. Modifier shorthands can not be used for then and else definitions, but every other feature like piped modifier function can be used.

We support AND and OR statements, no nesting evaluation is supported, so in practice AND and OR statements are applied in order of appearance:

```javascript
(new Template('Evaluate ?{$var1|eq:cat|eq:dog&eq:seal}{SEAL!}')).build({ animal: 'seal' })
// FALSE => ((false || false) && true)

(new Template('Evaluate ?{$var1|eq:cat|startsWith:s&eq:seal}{SEAL!}')).build({ animal: 'seal' })
// TRUE => ((false || true) && true)
```

## Variants

Variants are an interesting use case. Sometimes making small subtle changes to utterances have a semantic impact on the meaning of the utterance and so context from the string intercalation and expansion process would be required back to the generating code.

This is implemented with the `#match#` syntax

```javascript
(new Template('I #like# {$thing}', { 
	variants: { 
        negate: { like: "don't like" },
        exuberant: { like: [ "love", "have great passion for" ]}
    }
})).build({ thing: "icecream" })

/* 
Result:
[
	{ text: "I like icecream", variants: [ ] },
	{ text: "I don't like icecream", variants: [ "negate" ] },
	{ text: "I love icecream", variants: [ "exuberant"] },
	{ text: "I have great passion for icecream", variants: [ "exuberant"] },
]
*/
```

They can be set for the global context.

```javascript
import { Template, Modifiers, Variants } from 'my-little-pony';

Variants.add({ 
    negate: { like: "don't like" },
    exuberant: { like: [ "love", "have great passion for" ]}
});

(new Template('I #like# {$thing}')).build({ thing: "pineapple" });

/* 
Result:
[
	{ text: "I like pineapple", variants: [ ] },
	{ text: "I don't like pineapple", variants: [ "negate" ] },
	{ text: "I love pineapple", variants: [ "exuberant"] },
	{ text: "I have great passion for pineapple", variants: [ "exuberant"] },
]
*/
```

## Annotations

Also for context it might be useful to annotate templates so the generating code can get back some semantics about was generated. Those are removed from the template build output.

```javascript
(new Template("I like {$thing} @preference")).build({thing: 'icecream'})

/* 
Result:
[
	{ text: "I like icecream", variants: [ ], annotations: [ 'preference' ] }
]
*/
```

## Natural language optimizations

It does a good effort to:

* Remove any double space characters out of results
* Guarantee \\{  \\} \\[ \\] will escape accordingly
* Try to keep the first letter phrase upper case when replacing with variants

## License

Copyright (c) 2022 José da Mata. Licensed under the MIT License.
