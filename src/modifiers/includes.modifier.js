export const name = "includes";

export const description = "Test if array in template includes some value in argument";

export function module(context, value, arg0) {
    
    if(value instanceof Array && value.includes(arg0)) {        
        return true;
    }

    if(typeof value === "string" && value.match(arg0)) {
        return true;
    }
    
    return false;
}
