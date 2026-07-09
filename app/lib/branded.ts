declare const __brand: unique symbol

/**
 * A nominal type. `Brand<number, 'UsdPrice'>` is assignable to `number`, but a
 * plain `number` is not assignable to it — so a value can only enter the type
 * through a constructor that validates it.
 *
 * This matters because UsdPrice and BtcPrice are both numbers. Swapping them in
 * a component's props is a silent, plausible, invisible bug. Branding turns it
 * into a compile error.
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B }
