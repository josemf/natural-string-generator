import path from 'path';
import fs   from 'fs';

import merge from 'lodash/merge';
import uniq from 'lodash/uniq';

function arrayOfStrings (phrases) {

    if(phrases instanceof Array) {
        return phrases.map(phrase => {

            if(typeof phrase !== "string") {
                throw Error(`Templates required to be string`);
            }
        
            return phrase;
        })
    }

    if(typeof phrases === "undefined") {
        return [];
    }

    if(typeof phrases !== "string") {
        throw Error(`Templates required to be string`);
    }

    return [ phrases ];
}

export class Template {

    static RegexpAlt = /(?<!\\)\[([^\]]+)(?<!\\)\]/ig
    static RegexpAltTokens = /\|([^\|]+)/ig
    static RegexpTemplateVars = /(!)?(?<!\\)\{([^\|}]+)\|?([^}]+)?(?<!\\)\}([^\s{]+)?/ig
    static RegexpRequiredMatch = /!\{[^}]+\}/ig
    static RegexpConditionals = /\?\{([^\|}]+)\|?([^}]+)?\}(\{[^}]+\})(\{[^}]+\})?/ig
    static RegexpConditionalModifiers = /([\|\&])([a-zA-Z0-9_:]+)/ig
    static RegexpVariants = /(?<!\\)#([^#]+)(?<!\\)#/ig
    static RegexpAnnotations = /(?<!\\)@([a-zA-Z0-9_\-]+)/ig    
    
    constructor(phrases, options = {}) {        

        if(!(phrases instanceof Array) && typeof phrases === "object") {

            options = phrases;
            this._phrases = [];
            
        } else {
                        
           this.with(phrases)
        }
        
        this._variants = merge({}, Variants.Loaded, options.variants || {});
    }

    with(... multiplePhrasesExpansions) {

        if(multiplePhrasesExpansions.length === 0) {
            return this;
        }
        
        // or just a set of phrases
        if(multiplePhrasesExpansions.length === 1) {
            this._phrases = arrayOfStrings(multiplePhrasesExpansions[0]);
            return this;                    
        }
        
        const phrasesToCombine = multiplePhrasesExpansions.map(phrases => arrayOfStrings(phrases));

        // lets combine

        let combiningPhrases = phrasesToCombine.shift();
        let workingPhrases;
        
        while((workingPhrases = phrasesToCombine.shift())) {
            let stepCombineAllExistent = [];

            combiningPhrases.forEach(previousPhrase => {
                workingPhrases.forEach(workingPhrase => {

                    if('^' === workingPhrase.charAt(0)) {
                        stepCombineAllExistent.push(workingPhrase.substr(1))
                    } else {                    
                        stepCombineAllExistent.push(`${previousPhrase} ${workingPhrase}`)
                    }
                });
            });

            combiningPhrases = stepCombineAllExistent;
        }

        // unique
        this._phrases = uniq(combiningPhrases);
        return this;
    }
    
    _resolveAltTemplateVariable(templateVar, variables) {
        if(templateVar.charAt(0) === '$') {
            return "{" + templateVar + "}";
        }
        
        return templateVar;
    }
    
    _reduceTemplateArrays(phraseSegments, variables, resolveFunction) {        
        let constructions = [ [] ];
        
        phraseSegments.forEach(segment => {
            
            if(!(segment instanceof Array)) {
                
                constructions = constructions.map(a => {
                    return a.concat(segment);
                });
                
            } else {

                // First multiply and set
                    
                const newConstructions = [];
                    
                constructions.forEach(constructing => {                        
                    for(let i=0; i < segment.length; ++i) {
                        newConstructions.push(constructing.slice());
                    }
                });
                
                constructions = newConstructions;
                    
                // Then add segment
                    
                constructions.forEach((constructing, i) => {                        
                    constructing.push(resolveFunction(segment[i % segment.length], variables));
                });                    
            }
        });
        
        return constructions;        
    }
    
    _expandAlternativesSegment(phrase, match, left = 0, right = undefined) {

        const escaped = ("|" + match[1]).replace(/\\\|/, "__ESCAPE_PIPE__");        
        const matchedAlternatives = [ ... escaped.matchAll(Template.RegexpAltTokens) ];
        
        return {
            left: phrase.substring(left, match.index),
            right: phrase.substring(match.index + match[0].length, right),
            alternatives: matchedAlternatives.map(matchAlt => matchAlt[1].replace(/__ESCAPE_PIPE__/g, "|").trim())
        };
    }
    
    _expandAlternatives(phrases, variables) {
        let results = [];

        phrases.forEach(phrase => {

            const altsFound = [ ... phrase.matchAll(Template.RegexpAlt) ];
            
            if(altsFound.length === 0) {
                results.push(phrase);
                return;
            }

            const expanded = [];
            let ongoingLeft = 0;
            
            for(let i=0; i < altsFound.length; ++i) {

                const match = altsFound[i];
               
                const { left, alternatives, right } = this._expandAlternativesSegment(phrase, match, ongoingLeft, altsFound[i+1] ? altsFound[i+1].index : undefined); 
                
                expanded.push(left);
                expanded.push(alternatives);

                if(!altsFound[i+1]) {
                    expanded.push(right);
                }
                
                ongoingLeft = match.index + match[0].length;
            };
            
            results = results.concat(this._reduceTemplateArrays(expanded, variables, this._resolveAltTemplateVariable.bind(this)).map(tokens => tokens.join("")));
        });
        
        return results;
    }

    _parseTemplateModifierFunction(modifierFunctionWithArgs) {
        
        const args = modifierFunctionWithArgs.split(":");
        
        return {
            method: args.shift(),
            args: args
        };
    }

    
    _parseTemplateModifierFunctions(modifierFunctionsTemplate) {
        if(!modifierFunctionsTemplate) {
            return [];
        }
        
        const modifiers = modifierFunctionsTemplate.split("|");
        
        return modifiers.map(m => this._parseTemplateModifierFunction(m));
    }

    _extractTemplateVariableNameAndDefault(matchedName) {

        if(/=/.test(matchedName)) {
            return matchedName.split("=");
        }

        return [ matchedName, undefined ];
    }
    
    _expandTokenSegment(phrase, match, left = 0, right = undefined) {

        const [ templateVariableName, variableDefaultValue ] = this._extractTemplateVariableNameAndDefault(match[2]);
                
        return {
            left: phrase.substring(left, match.index),
            right: phrase.substring(match.index + match[0].length, right),
            definition: {
                mandatory: match[1] === '!',
                templateVariable: templateVariableName,
                defaultValue: variableDefaultValue,
                modifiers: this._parseTemplateModifierFunctions(match[3]),
                modifierShorthands: typeof match[4] === "string" ? match[4].split('') : [],
                matchText: match[0],
                matchIndex: match.index
            }
        };
    }
    
    _brokeIntoSegments(phrases) {
        let results = [];

        phrases.forEach(phrase => {

            const tokensFound = [ ... phrase.matchAll(Template.RegexpTemplateVars) ];
            
            if(tokensFound.length === 0) {
                results.push([ phrase ]);
                return;
            }

            const tokens = [];

            let ongoingLeft = 0;
            
            for(let i=0; i < tokensFound.length; ++i) {

                const match = tokensFound[i];

                const { left, definition, right } = this._expandTokenSegment(phrase, match, ongoingLeft, tokensFound[i+1] ? tokensFound[i+1].index : undefined); 
                
                tokens.push(left);
                tokens.push(definition);

                if(!tokensFound[i+1]) {
                    tokens.push(right);
                }
                
                ongoingLeft = match.index + match[0].length;                
            }

            results.push(tokens);
        });

        return results;
    }

    _getModifierExecutions(tokenContext, modifierNamesAndArgs, modifierShorthands) {
        const result = modifierNamesAndArgs.map(mod => {
            const modifier = Modifiers.get(mod.method);

            if(typeof modifier === "undefined") {
                throw Error(`Modifier \`${mod.method}\` not found for template token ${tokenContext.matchText} \`\``);
            }
            
            return {
                callback: modifier.module,
                args: mod.args
            };
        });

        let trailingChars = '';
        let incomingLiteral = false;
        
        if(modifierShorthands.length > 0) {
            const modifiersByShorthand = Modifiers.getShortandIndexed();

            modifierShorthands.forEach(shorthand => {

                // Handles escape character
                
                if(shorthand === '\\') {
                    incomingLiteral = true;
                    return;
                }

                if(true === incomingLiteral) {
                    incomingLiteral = false;
                    trailingChars += shorthand;
                    return;
                }

                // 
                
                const shorthandModifier = modifiersByShorthand[shorthand];
                
                if(typeof shorthandModifier === "undefined") {
                    trailingChars += shorthand;
                    return;
                }

                result.push({
                    callback: shorthandModifier.module,
                    args: []
                });
            });
        }

        return [ result, trailingChars ];        
    }

    _resolveModifierExecutionArgs(args, variables) {
        return args.map(a => {
            if(a.charAt(0) === '$') {
                const variableName = a.substr(1);
                return this._getVariableValue(variableName, variables);
            }

            return a;
        })
    }
    
    _applyModifierFunctions(variableValue, tokenContext, variables) {
        
        const [ templateFunctionExecutions, trailingChars ] = this._getModifierExecutions(tokenContext, tokenContext.modifiers, tokenContext.modifierShorthands);

        templateFunctionExecutions.forEach(execution => {
            variableValue = execution.callback(tokenContext, variableValue, ... this._resolveModifierExecutionArgs(execution.args, variables));
        });

        return variableValue + trailingChars;
    }

    _getVariableValue(variableName, values) {

        if(!values) {
            return undefined;
        }
        
        if(/\./.test(variableName)) {           

            const splitIndex = variableName.indexOf(".");
            const objectName = variableName.substr(0, splitIndex);
            const subVariableName = variableName.substr(splitIndex + 1);
            
            return this._getVariableValue(subVariableName, values[objectName]);
        }

        return values[variableName];
    }
    
    _resolveTemplateVariable(token, variables) {
        if(typeof token === "string") {
            return token;
        }

        let variableValue;

        if(token.templateVariable.charAt(0) === '$') {
            const variableName = token.templateVariable.substr(1);

            variableValue = this._getVariableValue(variableName, variables);
            
            if(typeof variableValue === "undefined") {

                if(typeof token.defaultValue === "undefined") {
                    return token.matchText;
                } 

                variableValue = token.defaultValue;
            }
            
        } else {
            variableValue = token.templateVariable;
        }

        variableValue = this._applyModifierFunctions(variableValue, token, variables);
        
        return variableValue;
    }
    
    _consolidateSegments(tokenizedPhrases, variables) {
        return tokenizedPhrases.map(tokenized => tokenized.map(token => this._resolveTemplateVariable(token, variables)).join(''));
    }

    _filterRemoveWithMissingRequiredVariables(phrase) {
        return !Template.RegexpRequiredMatch.test(phrase.text);
    }

    _expandArrayTokenVariables(tokenizedPhrases, variables) {
        const prepareForExpansion = tokenizedPhrases.map(tokens => tokens.map(token => {                       
            if(typeof token === "object"
               && token.modifiers.length === 0
               && token.templateVariable.charAt(0) === '$') {

                const variableName = token.templateVariable.substr(1);
                const variableValue = this._getVariableValue(variableName, variables);               
                
                if(variableValue instanceof Array) {                    
                    return variableValue.map(variableItemValue => {
                        return Object.assign({}, token, { templateVariable: variableItemValue });
                    });
                }
            }

            return token;
        }));

        return prepareForExpansion.map(tokenizedPhrase => this._reduceTemplateArrays(tokenizedPhrase, variables, (templateToken) => templateToken)).flat();
    }

    _getConditionalExecutions(modifiersLine) {
        const tokensFound = [ ... ("|"+modifiersLine).matchAll(Template.RegexpConditionalModifiers) ];

        return tokensFound.map(token => {

            const { method, args } = this._parseTemplateModifierFunction(token[2]);
            
            const modifier = Modifiers.get(method);

            if(typeof modifier === "undefined") {
                throw Error(`Modifier \`${method}\` not found for template token \`${token.input}\``);
            }
            
            return (variableValue, result) => {
                
                const modifierResult = modifier.module(undefined, variableValue, ... args);
                
                if(token[1] === '&') {
                    return result && !!modifierResult;
                }

                return result || !!modifierResult;                
            };
        });
    }
    
    _conditionalResolvesTrue(variableValue, modifiersLine) {        
        if(!modifiersLine) {
            return !!variableValue;
        }

        const conditionalExecutions = this._getConditionalExecutions(modifiersLine);

        return conditionalExecutions.reduce((result, execution) =>
                                            execution(variableValue, result), false);        
    }
    
    _resolveConditionals(phrases, variables) {

        return phrases.map(p => {

            let phrase = p;
            
            const tokensFound = [ ... phrase.matchAll(Template.RegexpConditionals) ];

            tokensFound.forEach(condToken => {
                const variableName = condToken[1];
                const variableValue = variableName.charAt(0) === '$' ?
                      this._getVariableValue(variableName.substr(1), variables) : variableName;
                
                const modifiersLine = condToken[2];
                const thenTemplate = condToken[3];
                const elseTemplate = condToken[4];
                
                if(this._conditionalResolvesTrue(variableValue, modifiersLine)) {
                    phrase = phrase.replace(condToken[0], thenTemplate);
                } else {
                    phrase = phrase.replace(condToken[0], elseTemplate || "");
                }
            });
                
            return this._normalizeText(phrase);
        });        
    }

    _variantsResolve(match) {

        const token = match[1].toLowerCase();

        // We make sure to keep the sentence case if exists        
        const upperFirstLetter = token[0] !== match[1][0];
        
        let found = [ { variant: undefined, text: match[1] } ];
        
        Object.keys(this._variants).forEach(variantName => {
            
            if(typeof this._variants[variantName][token] === "undefined") {                
                return;
            }

            if(typeof this._variants[variantName][token] === "string") {

                const variantText = this._variants[variantName][token];
                
                found.push({ variant: variantName, text: upperFirstLetter ? variantText.charAt(0).toUpperCase() + variantText.substr(1) : variantText });               
            } else if(this._variants[variantName][token] instanceof Array) {
                found = found.concat(this._variants[variantName][token].map(variantText => ({ variant: variantName, text: upperFirstLetter ? variantText.charAt(0).toUpperCase() + variantText.substr(1) : variantText })));
            } else {
                throw Error(`Bad format for variant with name ${variantName}: ${this._variants[variantName][token]}`);
            }
        });
               
        return found;
    }
    
    _variantsBrokeIntoSegments(phrase) {

        const tokens = [];        
        
        const tokensFound = [ ... phrase.matchAll(Template.RegexpVariants) ];        

        for(let i=0; i < tokensFound.length; ++i) {
            const token = tokensFound[i];

            if(tokens.length === 0 && token.index > 0) {
                tokens.push(phrase.substring(0, token.index));
            }

            tokens.push(this._variantsResolve(token));

            if(tokensFound[i+1]) {
                tokens.push(phrase.substring(token.index + token[0].length, tokensFound[i+1].index));
            } else {
                tokens.push(phrase.substring(token.index + token[0].length));
            }               
        }

        if(tokens.length === 0) {
            return [ phrase ];
        }
        
        return tokens;
    }

    _variantsConsolidate(tokenizedPhrases) {
        return tokenizedPhrases.map(tokenizedPhrase => {

            const variants = [];
            let text = '';
            
            tokenizedPhrase.forEach(token => {
                if(typeof token === "string") {
                    text += token;
                } else {
                    text += token.text;

                    if(typeof token.variant === "string") {
                        variants.push(token.variant);
                    }
                }                
            });

            return { text: text, variants };
        });
    }
    
    _processExpandAndConsolidateVariants(phrases) {
        // Tokenize the variants

        let consolidated = [];

        phrases.forEach(phrase => {
            const segmented = this._variantsBrokeIntoSegments(phrase);            
            const expanded  = this._reduceTemplateArrays(segmented, {}, variant => variant);          

            consolidated = consolidated.concat(this._variantsConsolidate(expanded));
        });

        return consolidated;
    }

    _cleanEscape(s) {
        return s.replace(/\\@/g, "@")
            .replace(/\\#/g, "#")
            .replace(/\\\{/g, "{")
            .replace(/\\\}/g, "}")
            .replace(/\\\[/g, "[")
            .replace(/\\\]/g, "]")
            .replace(/\\\|/g, "|");
    }
    
    _normalize(s) {
        return s.map(result => {
            return Object.assign({}, result, { text: this._cleanEscape(result.text) });
        });       
    }
    
    _normalizeText(s) {
        // remove double whitespace

        s = s.trim().replace(/\s\s/g, ' ');

        // clean escape characters for template tags

        return s;        
    }
    
    _extractAnnotations(phrases) {
        return phrases.map(phrase => {
            let s = phrase.text;
            const annotations = [];
            
            const tokensFound = [ ... s.matchAll(Template.RegexpAnnotations) ];

            tokensFound.forEach(token => {
                s = s.replace(token[0], '');
                annotations.push(token[1]);
            });

            return Object.assign({}, phrase, { text: this._normalizeText(s), annotations: annotations });
        });        
    }
    
    build(variables = {}) {

        // Expand [template var|other template|stuff] syntax
        
        const expanded = this._expandAlternatives(this._phrases, variables);

        // Resolve if then else syntax

        const resolved = this._resolveConditionals(expanded, variables);
        
        // Tokenize the phrases so we can interpolate
        
        const segmented = this._brokeIntoSegments(resolved);
        
        // Expand again by looking at any template variable value that is an array

        const expandedArrayTokens = this._expandArrayTokenVariables(segmented, variables);

        // Consolidate
        
        const consolidated = this._consolidateSegments(expandedArrayTokens, variables);

        // This is great, but we need to segment, expand and consolidate for variants

        const consolidatedWithVariants = this._processExpandAndConsolidateVariants(consolidated);

        // And then extract any annotation
        
        const final = this._extractAnnotations(consolidatedWithVariants);
        
        return this._normalize(final.filter(this._filterRemoveWithMissingRequiredVariables.bind(this)));
    }

    text(variables = {}) {
        return this.build(variables).map(built => built.text)
    }
}



export const Modifiers = {

    Loaded: {},
    
    add: (name, description, module, shorthand = undefined) => {

        if(typeof name !== "string" || typeof description !== "string" || typeof module !== "function") {
            throw Error(`A modifier function requires a name, a description and a module callback`);
        }

        if(typeof shorthand !== "undefined" && typeof shorthand !== "string"
           || (typeof shorthand === "string" && shorthand.length !== 1)) {

            throw Error(`When defining a shorthand, it will accept one character strings. Can use any character that is a alphanumeric and _ `);
        }
        
        Modifiers.Loaded[name] = {
            name: name,
            description: description,
            module: module,
            shorthand: shorthand
        };
    },

    module: path => {        
        const { name, description, module, shorthand } = require(path);        
        Modifiers.add(name, description, module, shorthand);        
    },

    resolve: modifiersPath => {
        const resolvedModifiersPath = path.resolve(modifiersPath);
        
        fs.readdirSync(resolvedModifiersPath).forEach(file => {

            if(/modifier\.js$/.test(file)) {            
                Modifiers.module(path.resolve(`${resolvedModifiersPath}/${file}`));
            }
        });        
    },

    loaded: () => Object.assign({}, Modifiers.Loaded),
    
    get: name => {
        return Modifiers.Loaded[name];
    },
    
    getShortandIndexed: () => {
        return Object.values(Modifiers.Loaded).reduce((modifiersByShortand, modifier) => {
            modifiersByShortand[modifier.shorthand] = modifier;

            return modifiersByShortand;
        }, {});
    }    
};

export const Variants = {

    Loaded: {},
    
    add: (variants) => {
        Variants.Loaded = merge(Variants.Loaded, variants);
    },

    loaded: () => {
        return Object.assign({}, Variants.Loaded);
    }
};

Modifiers.resolve(`${__dirname}/modifiers`);

