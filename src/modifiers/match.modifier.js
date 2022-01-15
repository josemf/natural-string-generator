export const name = "match";

export const description = "Test regexp match to value condition";

export function module(context, value, expStr, expFlags = undefined) {

    const regexp = new RegExp(expStr, expFlags);

    return regexp.test(value);    
}
