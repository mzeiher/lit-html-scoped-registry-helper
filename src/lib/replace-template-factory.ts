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

import { TemplateResult, Template } from "lit-html/lit-html.js";
import { TemplateFactory, templateFactory } from "lit-html/lib/template-factory.js";
import { ScopedRegistry, resolveCustomElementTagNameToScope } from "./custom-element-cache.js";
import { makeTemplateString } from './pre-html.js';

const dependencyMap: WeakMap<ScopedRegistry, TemplateFactory> = new WeakMap();
const placeholder = []; // specific identity for "no custom elements"

export function createReplaceTemplateFactory(customElements?: ScopedRegistry): (result: TemplateResult) => Template {
  if (typeof customElements === 'undefined' || (Array.isArray(customElements) && customElements.length === 0) || customElements === null) {
    customElements = placeholder;
  }
  let templateFactory = dependencyMap.get(customElements);
  if (templateFactory === undefined) {
    templateFactory = createCustomTemplateFactory(customElements);
    dependencyMap.set(customElements, templateFactory);
  }
  return templateFactory;
}

export const createCustomTemplateFactory = (customElements?: ScopedRegistry) => {
  const stringCache: WeakMap<TemplateStringsArray, TemplateStringsArray> = new WeakMap();
  return (result: TemplateResult): Template => {
    let cachedStrings = stringCache.get(result.strings);
    if (typeof cachedStrings === 'undefined') {
      cachedStrings = rewriteTemplateString(result.strings, customElements);
      stringCache.set(result.strings, cachedStrings);
    }
    (result as any).strings = cachedStrings;
    return templateFactory(result);
  }
}

const START_TAG = /<\s*([a-zA-Z-]+)/g;
const END_TAG = /<\s*\/s*([a-zA-Z-]+)/g;
const IS_ATTRIBUTE = / is*\s*=\s*["']{1}([a-zA-Z-]+)["']{1}/g;
const LAST_TAG = /<([a-z-]+)[^>]*$/;
const LAST_TAG_CLOSE = /<\/\s*([a-z-]*)\s*>$/;
const LAST_TAG_SELF_CLOSE = /<([a-z-]+)[^<]*\/>$/;

export const rewriteTemplateString = (input: TemplateStringsArray, customElements?: ScopedRegistry): TemplateStringsArray => {
  const array: string[] = [];
  let lastTag = '';
  for (let i = 0; i < input.length; i++) {
    lastTag = (LAST_TAG.exec(input[i]) || LAST_TAG_CLOSE.exec(input[i]) || LAST_TAG_SELF_CLOSE.exec(input[i]) || ['', lastTag])[1];
    array.push(input[i].replace(START_TAG, (_substr, ...replacer) => {
      return `<${resolveCustomElementTagNameToScope(replacer[0], undefined, customElements)}`;
    }).replace(END_TAG, (_substring, ...replacer) => {
      return `</${resolveCustomElementTagNameToScope(replacer[0], undefined, customElements)}`;
    }).replace(IS_ATTRIBUTE, (_substring, ...replacer) => {
      // test the case <div><button is=""></button></div> where last tag would be div intstead of button
      const baseTag = (/<([a-zA-Z-]+)[^>]+is*\s*=\s*["']{1}[a-zA-Z-]+["']{1}/.exec(input[i]) || [])[1] || lastTag;
      return ` is="${resolveCustomElementTagNameToScope(replacer[0], baseTag, customElements)}"`;
    }));
  }
  return makeTemplateString(array);
}
