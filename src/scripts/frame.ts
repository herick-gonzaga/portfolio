/** Calls `fn` at most once per animation frame, with the latest arguments. */
export function perFrame<A extends unknown[]>(fn: (...args: A) => void) {
  let frame = 0;
  let latest: A;
  return (...args: A) => {
    latest = args;
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), fn(...latest)));
  };
}
