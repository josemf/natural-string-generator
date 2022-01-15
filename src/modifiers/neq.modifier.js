import { module as eq } from './eq.modifier.js';

export const name = "neq";

export const description = "Test not equal to value condition";

export function module(context, value, arg0) {
    return !eq(context, value, arg0);
}
