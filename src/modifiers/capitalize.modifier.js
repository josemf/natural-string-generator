export const name = "capitalize";

export const description = "Capitalize a word by making the first letter uppercase.";

export function module(context, templateVariable, paragraph = undefined) {
    
    // Template mode
    
    if(paragraph && context.matchIndex !== 0) {
        return templateVariable;
    }
    
    return templateVariable.charAt(0).toUpperCase() + templateVariable.substr(1);
}

export const shorthand = 'C';
