/**
 * @license
 * Copyright (c) 2020 Mathis Zeiher
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export type ScopedRegistry = Array<typeof HTMLElement> | { [tag: string]: typeof HTMLElement };

function createRandomCEName(name: string): string {
  // this function creates a random name like name-xxxx-xxxx should be enough randomness :)
  return [
    ...(name || 'anonymouse').toLowerCase().split(''),
    '-',
    ...[0, 0, 0, 0].map(() => String.fromCharCode(Math.round(Math.random() * 24) + 97)),
    '-',
    ...[0, 0, 0, 0].map(() => String.fromCharCode(Math.round(Math.random() * 24) + 97))
  ].join('');
}

const customElementCache: Map<string, Map<typeof HTMLElement, string>> = new Map(); // cache custom elements to reuse the identifiers which point to the same implementation

export function getCustomElementTagName(elementConstructor: typeof HTMLElement, builtIn: string): string {
  if (!customElementCache.has(builtIn || '')) {
    customElementCache.set(builtIn || '', new Map());
  }
  const map = customElementCache.get(builtIn || '');
  if (!map.has(elementConstructor)) {
    let newName = createRandomCEName(elementConstructor.name);
    try {
      window.customElements.define(newName, elementConstructor, builtIn ? { extends: builtIn } : undefined);
    } catch (e) { // element already registered but not with our cache, try to get the element name from the instance
      if(builtIn) { // if builtin element invoking the constructor returns the element which the ce extends so we need to hack a way to get the name :)
        newName = /is="([a-z-]*)"/.exec(new elementConstructor().outerHTML)[1];
      } else {
        newName = new elementConstructor().tagName.toLowerCase();
      }
    }
    map.set(elementConstructor, newName);
  }
  return map.get(elementConstructor);
}

export function resolveCustomElementTagNameToScope(tag: string, builtInTag: string, scope: ScopedRegistry): string {
  const customElement = getCustomElementFromRegistry(tag, scope);
  return customElement ? getCustomElementTagName(customElement, builtInTag) : tag;
}

export function getCustomElementFromRegistry(tag: string, scopedRegistry: ScopedRegistry) {
  return Array.isArray(scopedRegistry) ?
    scopedRegistry.find((entry) => entry.name === tag) :
    (Object.entries(scopedRegistry).find(([name]) => {
      return name === tag;
    }) || [undefined, undefined])[1];
}
