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

import { Template } from "lit-html/lit-html.js";
import { TemplatePart } from "lit-html/lib/template.js";
import { tokenizer as parser } from "./tokenizer.js";
import { getCustomElementTagName } from './custom-element-cache.js';
import { ScopedRegistry, getCustomElementFromRegistry } from "./custom-element-cache.js";

const namespaceMap = {
  'svg': 'http://www.w3.org/2000/svg',
  'mathml': 'http://www.w3.org/1998/Math/MathML',
  'html': 'http://www.w3.org/1999/xhtml'
}

export class TokenizerTemplate implements Template {
  readonly parts: TemplatePart[] = [];
  readonly element: HTMLTemplateElement;

  constructor(type: 'svg' | 'html' | 'mathml', templateString: TemplateStringsArray, placeholder: readonly unknown[], scopedRegistry: ScopedRegistry) {

    this.element = document.createElement('template');

    const tokenizer = parser(templateString, ...placeholder);
    const elementStack: Array<Element | Text | DocumentFragment> = [this.element.content];
    let index = -1;
    let isInAttribute = false;
    let hasAttributeSubstitution = false;
    let currentAttributeName = '';
    let attributeStatics: string[] = undefined;
    let attributeSubstitutions: unknown[] = undefined;
    let staticAttributes: { name: string; value: unknown }[] = [];
    tokenizer.on('tagopen', () => {
      staticAttributes = [];
      index++;
    });
    tokenizer.on('tagopenend', (tagName) => {
      if (typeof tagName !== 'string') { // forbid substitution of tag names <${'div'} />
        throw new Error('sustitutions for elements are not supported, please use a helper library like carehtml or preHTML helper of this package');
      }
      /** resolve tagname to constructor name e.g <MyCustomElement /> */
      const customElementConstructor: typeof HTMLElement = getCustomElementFromRegistry(tagName, scopedRegistry);
      const resolvedTag: string = customElementConstructor ? getCustomElementTagName(customElementConstructor, '') : tagName;

      /** check if a built-in element is extended by a custom element */
      const extendsBuiltInAttribute = staticAttributes.find(attribute => attribute.name === 'is');
      let builtInExtendsTag: string = undefined;
      if (extendsBuiltInAttribute) { // if current node has a "is" attribute
        const extendsTagName = extendsBuiltInAttribute.value;
        /** find cached custom element for "is" value */
        const customElementConstructor = typeof extendsTagName === 'string' ? getCustomElementFromRegistry(extendsTagName, scopedRegistry) : extendsTagName as typeof HTMLElement;
        /** if cached ellement found, replace the name with the cached entry, if not use provided "is" value */
        builtInExtendsTag = customElementConstructor ? getCustomElementTagName(customElementConstructor, resolvedTag) : extendsTagName as string;
        // replace value in static array string with the cached custom element name
        extendsBuiltInAttribute.value = builtInExtendsTag;
      }
      let node: Element = null;
      if (type === 'html') {
        node = document.createElement(resolvedTag.toLowerCase(), builtInExtendsTag ? { is: builtInExtendsTag } : undefined);
      } else {
        node = document.createElementNS(namespaceMap[type], resolvedTag.toLowerCase());
      }
      // add all static attributes to node
      staticAttributes.forEach((attribute) => {
        if (attribute.name.indexOf(':') >= 0) { // attribute with namespace
          node.setAttributeNS(attribute.name.split(':')[0], attribute.name.split(':')[1], attribute.value as string);
        } else {
          node.setAttribute(attribute.name, attribute.value as string);
        }
      });
      elementStack.push(node);
    });
    tokenizer.on('attributestart', (data) => {
      isInAttribute = true;
      currentAttributeName = data;
      attributeStatics = [];
      attributeSubstitutions = [];
    });
    tokenizer.on('text', (data) => {
      if (isInAttribute) {
        attributeStatics.push(data);
      } else {
        const textNode = document.createTextNode(data);
        elementStack[elementStack.length - 1].appendChild(textNode);
        index++;
      }
    });
    tokenizer.on('attributeend', () => {
      if (hasAttributeSubstitution && currentAttributeName === 'is') { // special case for <button is=${Element} />
        throw new Error('sustitutions for is attributes are not supported');
      } else if (hasAttributeSubstitution || ['.', '?', '@'].indexOf(currentAttributeName.charAt(0)) >= 0) {
        this.parts.push({
          type: 'attribute',
          index: index,
          name: currentAttributeName,
          strings: attributeStatics
        });
      } else {
        staticAttributes.push({ name: currentAttributeName, value: attributeStatics.join('') });
      }
      isInAttribute = false;
      hasAttributeSubstitution = false;
    });
    tokenizer.on('tagclose', () => {
      const element = elementStack.pop();
      elementStack[elementStack.length - 1].appendChild(element);
    });
    tokenizer.on('substitution', (substitution) => {
      if (!isInAttribute) {
        const textNode = document.createTextNode('');
        elementStack[elementStack.length - 1].appendChild(textNode);
        index++;
        this.parts.push({
          type: "node",
          index: index
        });
      } else if (isInAttribute) {
        hasAttributeSubstitution = true;
        attributeSubstitutions.push(substitution);
      }
    });
    tokenizer.parse();
  }
}
