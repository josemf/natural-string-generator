import space from 'to-space-case';

export const name = "space";

export const description = "Transforms the template variable from snake_case or camelCase to space case";

export function module(context, templateVariable) {
    
    const isUpperCase =
          templateVariable.charAt(0) === templateVariable.charAt(0).toUpperCase()
          && context.matchIndex === 0;
    
    const spaced = space(templateVariable);

    if(isUpperCase) {
        return spaced.charAt(0).toUpperCase() + spaced.substr(1);
    }

    return spaced;
}

export const shorthand = '_';
