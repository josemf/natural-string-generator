export const name = "gt";

export const description = "Test greater then to value condition";

export function module(context, value, arg0) {
    
    if(typeof value === "number") {
        const argNumber = Number(arg0);
        
        return value > argNumber;        
    }
    
    return value > arg0;
}
