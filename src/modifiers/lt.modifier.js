export const name = "lt";

export const description = "Test lower then to value condition";

export function module(context, value, arg0) {

    if(typeof value === "number") {
        const argNumber = Number(arg0);
        
        return value < argNumber;        
    }
    
    return value < arg0;
}
