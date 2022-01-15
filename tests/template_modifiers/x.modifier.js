export const name = "xmod";

export const description = "The x test modifier";

export function module(context, templateVariable) {

    return "X"+templateVariable+"X";
}

export const shorthand = 'x';
