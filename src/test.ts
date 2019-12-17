import { render, html, TemplateResult, Template } from './../node_modules/lit-html/lit-html.js';
import { TemplateFactory } from '../node_modules/lit-html/lib/template-factory.js';
import { TemplatePart } from '../node_modules/lit-html/lib/template.js';
import { parser } from './tokenizer.js';

export type templateCache = {
  readonly stringsArray: WeakMap<TemplateStringsArray, TokenizerTemplate>; //
  readonly keyString: Map<string, TokenizerTemplate>;
};


class TokenizerTemplate implements Template {
  readonly parts: TemplatePart[] = [];
  readonly element: HTMLTemplateElement;

  constructor(templateString: TemplateStringsArray, placeholder: readonly unknown[]) {
    this.element = document.createElement('template');

    const tokenizer = parser(templateString, placeholder);
    let index = -1;
    let elementStack: Array<HTMLElement | Text | SVGElement | DocumentFragment> = [this.element.content];
    let isInAttribute = false;
    let hasAttributeSubstitution = false;
    let currentAttributeName = '';
    let attributeStatics: string[] = undefined;
    tokenizer.on('tagopen', (data) => {
      const node = document.createElement(data);
      elementStack.push(node);
      index++;
    });
    tokenizer.on('attributestart', (data) => {
      isInAttribute = true;
      currentAttributeName = data;
      attributeStatics = [];
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
    tokenizer.on('attributeend', (data) => {
      if (hasAttributeSubstitution || ['.', '?', '@'].indexOf(currentAttributeName.charAt(0)) >= 0) {
        if(attributeStatics.length % 2 === 1) {
          attributeStatics.push('');
        }
        this.parts.push({
          type: 'attribute',
          index: index,
          name: currentAttributeName,
          strings: attributeStatics
        });
      } else {
        (elementStack[elementStack.length - 1] as HTMLElement).setAttribute(currentAttributeName, attributeStatics.join());
      }
      isInAttribute = false;
      hasAttributeSubstitution = false;
    });
    tokenizer.on('tagclose', (data) => {
      const element = elementStack.pop();
      elementStack[elementStack.length - 1].appendChild(element);
    });
    tokenizer.on('substitution', (data) => {
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
      }
    });
    tokenizer.parse();
  }
}

const dependencyMap: WeakMap<any[], TemplateFactory> = new WeakMap();

const getTemplateFactoryForDependencies = (dependencies: any[]): (result: TemplateResult) => TokenizerTemplate => {
  let templateFactory = dependencyMap.get(dependencies);
  if (templateFactory === undefined) {
    templateFactory = createCustomTemplateFactory(dependencies);
    dependencyMap.set(dependencies, templateFactory);
  }
  return templateFactory;
}

const createCustomTemplateFactory = (dependencies: any[]) => {
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
      template = new TokenizerTemplate(result.strings, result.values);
      // Cache the Template for this key
      templateCache.keyString.set(key, template);
    }

    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
  }

}

const tmpl = html`<div class="staticclass" style="background-color: ${'#f0f'}; color: #0f0" .tabIndex="${0}">before ${Date.now()} after</div>`;
let minOld = 100;
let maxOld = 0;
let minNew = 100;
let maxNew = 0;
let newAvg = 0;
let oldAvg = 0;
for(let i = 0; i < 100; i++) {
  let averageOld = 0;
  let averageNew = 0;
  for(let i = 0; i < 1000; i++) {
    let start = performance.now();
    new Template(tmpl, tmpl.getTemplateElement());
    averageOld += (performance.now() - start);
    start = performance.now();
    new TokenizerTemplate(tmpl.strings, tmpl.values);
    averageNew += (performance.now() - start);
    minOld = Math.min(averageOld, minOld);
    maxOld = Math.max(averageOld, maxOld);
    minNew = Math.min(averageNew, minNew);
    maxNew = Math.max(averageNew, maxNew);
    oldAvg += averageOld / 1000;
    newAvg += averageNew / 1000;
  }
}
console.log(`old ${minOld}-${maxOld} avg: ${oldAvg/100} new: ${minNew}-${maxNew} avg: ${newAvg/100}`);


// window.setInterval(() => {
//   const tmpl = html`<div class="staticclass" style="background-color: ${'#f0f'}; color: #0f0" .tabIndex="${0}">before ${Date.now()} after</div>`;
//   let start = performance.now();
//   render(tmpl, document.querySelector('#new'), {
//     templateFactory: getTemplateFactoryForDependencies([])
//   });
//   console.log(`time new renderer: ${performance.now() - start}`);
//   start = performance.now();
//   render(tmpl, document.querySelector('#old'));
//   console.log(`time old renderer: ${performance.now() - start}`);
// }, 500);


// `

// <!-- comment -->
// <div style="background-color: #fff" id="${'test'}" boolean-attribute empty-attribute="" .lit-prop="${'test'}"><span>before ${'test'} after</span></div>
// <div></div>

// <!-- comment with ${'test'} substitution -->

// `
