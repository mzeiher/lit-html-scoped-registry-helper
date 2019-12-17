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

import { html, svg, render } from 'lit-html/lit-html.js';
import { createScopedTokenizedTemplateFactory } from '../src/lib/tokenizer-template-factory.js';
import { createReplaceTemplateFactory, rewriteTemplateString } from '../src/lib/replace-template-factory.js';
import { preHTML } from '../src/lib/pre-html.js';

class CustomElement extends HTMLElement {

  _property = '';

  set property(value: string) {
    this._property = value;
    this.shadowRoot.innerHTML = value;
  }

  get property(): string {
    return this._property;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this._property;
  }
}

class ExtendsBuiltInButton extends HTMLButtonElement {

  _property = '';

  set property(value: string) {
    this._property = value;
    this.innerHTML = value;
  }

  get property(): string {
    return this._property;
  }

  constructor() {
    super();
    this.innerHTML = this._property;
  }
}

function extractTemplateStringsArray(strings: TemplateStringsArray, ...placeholder: unknown[]) {
  return { strings, placeholder };
}

[
  {
    name: 'tokenized-template-factory:',
    factory: createScopedTokenizedTemplateFactory
  }, {
    name: 'replacer-template-factory:',
    factory: createReplaceTemplateFactory
  }
].forEach(value => {
  describe(value.name + 'templatefactory tests', () => {
    it(value.name + 'templatefactory instatiation', () => {
      const dependencies = [];
      const templateFactoryInstance = value.factory(dependencies);
      expect(templateFactoryInstance).toBe(value.factory(dependencies));
      expect(templateFactoryInstance).not.toBe(value.factory([CustomElement]));
    });

    if (createScopedTokenizedTemplateFactory === value.factory) { // run only for tokenized template factory
      it(value.name + 'template cache test', () => {
        const templateResult = html`<div />`;
        const templateFactoryInstance = value.factory([]);

        const tokenizedTemplate = templateFactoryInstance(templateResult);

        expect(tokenizedTemplate).toBe(templateFactoryInstance(templateResult), 'expect same template for same template result');
        expect(tokenizedTemplate).not.toBe(value.factory([CustomElement])(templateResult));
      });
    }

    it(value.name + 'preHTML cache test', () => {
      const { strings, placeholder } = extractTemplateStringsArray`<${CustomElement}></${CustomElement}>`;

      expect(preHTML(strings, ...placeholder).strings).toBe(preHTML(strings, ...placeholder).strings);
      expect(preHTML(strings, ...placeholder).strings).not.toBe(preHTML`<${CustomElement}>test</${CustomElement}>`.strings);
    });

    it(value.name + 'template creation test', () => {
      const node = document.createElement('div');
      const template = html`<div>test</div>`;
      render(template, node, { templateFactory: value.factory([]) });

      expect(node.children[0].nodeName).toBe('DIV');
      expect(node.children[0].innerHTML).toBe('test');
    });

    it(value.name + 'template creation with custom element - array scoped registry', () => {
      const node = document.createElement('div');
      const template = html`<CustomElement>test</CustomElement>`;
      render(template, node, { templateFactory: value.factory([CustomElement]) });

      expect(node.children[0]).toBeInstanceOf(CustomElement);
    });

    it(value.name + 'template creation with extended built-in custom element - array scoped registry', () => {
      const node = document.createElement('div');
      const template = html`<button is="ExtendsBuiltInButton"></button>`;
      render(template, node, { templateFactory: value.factory([ExtendsBuiltInButton]) });

      expect(node.children[0]).toBeInstanceOf(ExtendsBuiltInButton);
    });

    it(value.name + 'template creation with custom element - object scoped registry', () => {
      const node = document.createElement('div');
      const template = html`<my-custom-element>test</my-custom-element>`;
      render(template, node, { templateFactory: value.factory({ 'my-custom-element': CustomElement }) });

      expect(node.children[0]).toBeInstanceOf(CustomElement);
    });

    it(value.name + 'template creation with extended built-in custom element - object scoped registry', () => {
      const node = document.createElement('div');
      const template = html`<button is="my-custom-element"></button>`;
      render(template, node, { templateFactory: value.factory({ 'my-custom-element': ExtendsBuiltInButton }) });

      expect(node.children[0]).toBeInstanceOf(ExtendsBuiltInButton);
    });

    if (value.factory === createScopedTokenizedTemplateFactory) {
      it(value.name + 'template creation with substituted custom element', () => {
        const node = document.createElement('div');
        const template = html`<${CustomElement}>test</${CustomElement}>`;
        expect(() => render(template, node, { templateFactory: value.factory() })).toThrow();
      });
    }

    it(value.name + 'template creation with substituted custom element an preHTML helper', () => {
      const node = document.createElement('div');
      const template = preHTML`<${CustomElement}>test</${CustomElement}>`;
      render(template, node, { templateFactory: value.factory() });
      expect(node.children[0]).toBeInstanceOf(CustomElement);
    });

    if (value.factory === createScopedTokenizedTemplateFactory) { // only run for tokenized factory
      it(value.name + 'template creation with substituted extended built-in custom element', () => {
        const node = document.createElement('div');
        const template = html`<button is="${ExtendsBuiltInButton}"></button>`;
        expect(() => render(template, node, { templateFactory: value.factory() })).toThrow();
      });
    }

    it(value.name + 'template creation svg', () => {
      const node = document.createElement('div');
      const template = svg`<svg height="100" width="100">
      <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
      Sorry, your browser does not support inline SVG.  
    </svg>`;
      render(template, node, { templateFactory: value.factory([]) });

      expect(node.children[0].tagName).toBe('svg');
      expect(node.children[0].children[0].tagName).toBe('circle');
      expect(node.children[0].children[0].getAttribute('cx')).toBe('50');
      expect(node.children[0].children[0].getAttribute('cy')).toBe('50');
      expect(node.children[0].children[0].getAttribute('r')).toBe('40');
      expect(node.children[0].children[0].getAttribute('stroke')).toBe('black');
      expect(node.children[0].children[0].getAttribute('stroke-width')).toBe('3');
      expect(node.children[0].children[0].getAttribute('fill')).toBe('red');
      expect(node.children[0].namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it(value.name + 'lit-html substitution', () => {
      const scopedRegistry = [CustomElement];
      const node = document.createElement('div');

      const template = (attribute, property, booleanAttribute) => html`<CustomElement attribute="${attribute}" .property="${property}" ?boolean-attribute="${booleanAttribute}"></CustomElement>`;

      render(template('foo', 'foo', true), node, { templateFactory: value.factory(scopedRegistry) });
      expect(node.children[0].getAttribute('attribute')).toBe('foo');
      expect((node.children[0] as any).property).toBe('foo');
      expect(node.children[0].hasAttribute('boolean-attribute')).toBeTrue();

      const nodeReference = node.children[0];

      render(template('bar', 'bar', false), node, { templateFactory: value.factory(scopedRegistry) });
      expect(node.children[0].getAttribute('attribute')).toBe('bar');
      expect((node.children[0] as any).property).toBe('bar');
      expect(node.children[0].hasAttribute('boolean-attribute')).toBeFalse();

      expect(node.children[0]).toBe(nodeReference);
    });

    it(value.name + 'tokenize/lit output', () => {
      const nodeLit = document.createElement('div');
      const nodeCustomFactory = document.createElement('div');
      const template = html`<div class="staticclass" style="background-color: ${'#f0f'}; color: #0f0" .tabIndex="${0}">before ${Date.now()} after</div>`;
      render(template, nodeLit);
      render(template, nodeCustomFactory, { templateFactory: value.factory() });
      expect(nodeLit.innerHTML).toBe(nodeCustomFactory.innerHTML);
    });

  });
});

describe('ReplaceTemplateFactory tests', () => {
  class StandaloneCustomElement extends HTMLElement {

  }
  window.customElements.define('standalone-custom-element', StandaloneCustomElement);

  class ButtonCustomElement extends HTMLButtonElement {

  }
  window.customElements.define('button-custom-element', ButtonCustomElement, { extends: 'button' });

  it('simple replacement test', () => {
    const template = getTemplateStringHelper`<StandaloneCustomElement></StandaloneCustomElement>`;
    const output = rewriteTemplateString(template, [StandaloneCustomElement]);
    expect(output.join('')).toBe('<standalone-custom-element></standalone-custom-element>');
  });
  it('simple builtin replacement test', () => {
    const template = getTemplateStringHelper`<button is="ButtonCustomElement"></button>`;
    const output = rewriteTemplateString(template, [ButtonCustomElement]);
    expect(output.join('')).toBe('<button is="button-custom-element"></button>');
  });
  it('mixed ce and builtin replacement test', () => {
    const template = getTemplateStringHelper`<StandaloneCustomElement><button is="ButtonCustomElement"></button></StandaloneCustomElement>`;
    const output = rewriteTemplateString(template, [ButtonCustomElement, StandaloneCustomElement]);
    expect(output.join('')).toBe('<standalone-custom-element><button is="button-custom-element"></button></standalone-custom-element>');
  });
  it('mixed ce and builtin replacement test with substitutions', () => {
    const template = getTemplateStringHelper`<StandaloneCustomElement attr="${0}">${0}<button attr="${0}" is="ButtonCustomElement" attr2="${0}">${0}</button>${0}</StandaloneCustomElement>`;
    const output = rewriteTemplateString(template, [ButtonCustomElement, StandaloneCustomElement]);
    expect(output.join('')).toBe('<standalone-custom-element attr=""><button attr="" is="button-custom-element" attr2=""></button></standalone-custom-element>');
  });
});

function getTemplateStringHelper(strings: TemplateStringsArray, ..._values: unknown[]): TemplateStringsArray {
  return strings;
}
