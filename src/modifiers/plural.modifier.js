import pluralize from 'pluralize';

export const name = "plural";

export const description = "Transforms the template variable to its plural form. If an argument is provided will transform only if the argument is zero or greater than one.";

export function module(context, templateVariable, count = undefined) {

    // Conditionals mode
    // There is no context when working with conditionals
    
    if(typeof context === "undefined") {
        return templateVariable === pluralize(templateVariable);
    }
    
    // Template mode
    
    if(typeof count === "undefined") {
        count = 2;
    }
    
    const countParsed = Number(count);
    
    if(isNaN(countParsed)) {
        throw Error(`Template: plural.modifier: If using an argument, this must be a valid number. Supplied \`${count}\``);
    }

    return pluralize(templateVariable, countParsed);
}

export const shorthand = 's';
