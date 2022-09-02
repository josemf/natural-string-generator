export const name = "join";

export const description = "Accepts an array and join using the supplied character. If the character is a virgule it will do a separate the last item with an `and`.";

export function module(context, values, joinChar) {
    if(!(values instanceof Array)) {
        throw Error(`{var|join:x} Can only join array variables`);
    }
    
    if(values.length === 1) {
        return values[0];
    }
    
    if(/,\s*$/.test(joinChar)) {
        const tmpValues = [].concat(values);        
        const lastValue = tmpValues.pop();

        return tmpValues.join(", ") + " and " + lastValue;
    }
    
    return values.join(joinChar);
}
