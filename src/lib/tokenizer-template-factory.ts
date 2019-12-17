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

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { TokenizerTemplate } from "./tokenizer-template.js";
import { TemplateFactory } from "lit-html/lib/template-factory.js";
import { TemplateResult } from "lit-html/lit-html.js";
import { ScopedRegistry } from "./custom-element-cache.js";

export const createScopedTokenizedTemplateFactory = (customElements?: ScopedRegistry): (result: TemplateResult) => TokenizerTemplate => {
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

const dependencyMap: WeakMap<ScopedRegistry, TemplateFactory> = new WeakMap();
const placeholder = []; // specific identity for "no custom elements"

type templateCache = {
  readonly stringsArray: WeakMap<TemplateStringsArray, TokenizerTemplate>;
  readonly keyString: Map<string, TokenizerTemplate>;
};

const createCustomTemplateFactory = (customElements: ScopedRegistry) => {
  const templateCaches = new Map<string, templateCache>();
  return (result: TemplateResult) => {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
      templateCache = {
        stringsArray: new WeakMap<TemplateStringsArray, TokenizerTemplate>(),
        keyString: new Map<string, TokenizerTemplate>()
      };
      templateCaches.set(result.type, templateCache);
    }

    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
      return template;
    }

    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join();

    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
      // If we have not seen this key before, create a new Template
      template = new TokenizerTemplate(result.type as 'svg' | 'html', result.strings, result.values, customElements);
      // Cache the Template for this key
      templateCache.keyString.set(key, template);
    }

    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
  }
}
