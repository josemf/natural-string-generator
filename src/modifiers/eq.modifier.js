export const name = "eq";

export const description = "Test equal to value condition";

export function module(context, value, arg0) {

    if(typeof value === "boolean") {
        if(value === true) return arg0 === "true" || arg0 === "yes";

        return arg0 === "false" || arg0 === "no" || !arg0;        
    }

    if(typeof value === "number") {
        const argNumber = Number(arg0);
        
        return value == argNumber;        
    }

    if(typeof value === "undefined" || value === null) {
        return !arg0;
    }
    
    return value == arg0;
}
