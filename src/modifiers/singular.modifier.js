import pluralize from 'pluralize';

export const name = "singular";

export const description = "Transforms the template variable to its singular form.";

export function module(context, templateVariable) {
    
    if(typeof context === "undefined") {
        return templateVariable === pluralize.singular(templateVariable);
    }
    
    return pluralize.singular(templateVariable);
}

export const shorthand = undefined;
