export const name = "lowercase";

export const description = "Makes all letters lower case.";

export function module(context, templateVariable) {    
    return templateVariable.toLowerCase();
}

export const shorthand = 'l';
