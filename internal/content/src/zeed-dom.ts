import { VElement } from 'zeed-dom';

// zeed-dom is the only DOM that runs in workerd (see ./body), and it is a
// partial one. TipTap's parse rules reach for two members it does not have,
// and both throw rather than degrade: a markdown table dies on `closest`, and
// a fenced code block dies iterating `classList`. Filling them in here keeps
// the gap in one place, named, instead of shaping what a body may contain.

type WithClosest = { closest?: (selector: string) => VElement | null };

function ancestorMatching(node: VElement | null, selector: string): VElement | null {
  if (node === null) {
    return null;
  }
  return node.matches(selector) ? node : ancestorMatching(node.parentElement, selector);
}

(VElement.prototype as WithClosest).closest ??= function closest(
  this: VElement,
  selector: string,
): VElement | null {
  return ancestorMatching(this, selector);
};

const classList = Object.getOwnPropertyDescriptor(VElement.prototype, 'classList');

if (classList?.get !== undefined) {
  const own = (element: VElement): object => classList.get!.call(element) as object;
  Object.defineProperty(VElement.prototype, 'classList', {
    ...classList,
    // zeed-dom's own list has contains/add/remove and nothing else, so a
    // DOMTokenList's index, length and iterator are added alongside it rather
    // than replacing it.
    get(this: VElement) {
      const names = String(this.className ?? '')
        .split(/\s+/)
        .filter((name) => name.length > 0);
      return Object.assign(own(this), Object.fromEntries(names.entries()), {
        length: names.length,
        [Symbol.iterator]: () => names.values(),
      });
    },
  });
}
