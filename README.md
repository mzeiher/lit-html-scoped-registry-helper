# lit-html-scoped-registry-helper
This library provides some lit-html helper functions to make working with scoped custom elements easier until scoped custom element registries are supported by the platform.

## Installation
```bash
npm install lit-html-scoped-registry-helper
```

## Compatibility/Requirements
Currently `lit-html` version `>=1.1.2` are supported. At the moment only the default renderer is supported not the shady renderer function (could be supported with cloning the code of the shady renderer).

* IE: **not supported**
* Edge: **not supported**
* Edge (Chromium): 76+
* Chome: 60+
* Safari: 11+ (no support for extending built-in elements)
* Firefox: 65+

## Usage
### preHTML helper
The `preHTML` helper can be used as a replacement for lit-htmls' native `html` tagged template function. It is inspired by @darioncos [gist](https://gist.github.com/darionco/823817008596bb7a518821e7b8201478)
```javascript
import { render } from 'lit-html'
import { preHTML } from 'lit-html-scoped-registry-helper'

class CustomElements extends HTMLElement {}

const doRender = () => render(preHTML`<div><${CustomElement}></${CustomElement}></div>`, document.body);
```

### createReplaceTemplateFactory and createScopedTemplateFactory
these two helper create a template factory which can be used instead of the built in one provided by lit-html. The createScopedTemplateFactory factory is backed by the html5 tokenizer included in this library, for smaller html templates its slightly faster (see `test/templateinstantiation.bench.ts` or run `npm run benchmark` in this repository). Both factories create a template factory scoped to the passed registry.

```javascript
import { render } from 'lit-html'
import { createScopedTemplateFactory, createScopedTemplateFactory } from 'lit-html-scoped-registry-helper'

class CustomElement extends HTMLElement {}
class CustomElementBuiltIn extends HTMLButtonElement {} // needs polyfill in safari

// you can either create a scoped registry with just the constructor functions (these must be named, no anonymous classes are supported)
const registry = [CustomElement, CustomElementBuiltin];
// or you can explicitly state the custom elements (here you could define anonymouse custom elements)
const alternativeRegistry = { 
    'custom-element': CustomElement, 
    'custom-element-builtin' : CustomElementBuiltin
}

// call with registry with named constructors
const renderFuncImplicit = () => render(html`<CustomElement></CustomElement><button is="CustomElementBuiltin"></button>`, document.body, { templateFactory: createScopedTemplateFactory(registry)}); // you can also use createReplaceTemplateFactory

// call with registry with explicit custom-element names
const renderFuncExplicit = () => render(html`<custom-element></custom-element><button is="custom-element-builtin"></button>`, document.body, { templateFactory: createScopedTemplateFactory(registry)}); // you can also use createReplaceTemplateFactory
```
**Important**: the created template factories are cached and bound to the identity of the scoped registry `createXXXTemplateFactory([CustomElement])` will always create a new template factory whereas `createXXXTemplateFactory(myScopedRegistry)` will reuse template factories.

## Caveats
* **possible memory leak**: both factories and the preHTML helper cache the mapping of a custom element constructor to the generated custom element name, so there is always only one custom element tag for every custom element constructor (already defined custom elements are automatically detected and will be used). Due to the nature of custom elements there is no way to clean up custom elements which are no longer needed, so all defined custom elements will remain in memory until the complete site is refreshed
* **tag css selectors don't work** If you use selectors on tags in your `<style>` these will not work, because this library will generate a random name for the scoped custom elements (`<constructorname-xxxx-xxxx>`) so please use class or id selectors.

# Bonus: HTML5 Tokenizer
This library contains a small and fast HTML5 tokenizer/parser inspired by [ObservableHQ](https://observablehq.com/@observablehq/htl) which is used by `createScopedTemplateFactory`

## Usage
```javascript
import { tokenizer } from 'lit-html-scoped-registry-helper'

const parser = tokenizer`<div style="test">${test}text</div>`;

parser.on('tagopen', (name) => { 
    console.log(`tag open: ${name}`)
});

parser.parse();
```

The following string 
```javascript
const parser = tokenizer`<div style="color: ${'#fff'}">
<span style="background-color: #fff">${test}text</span>
</div>`
```
will output the following events in order
* start
* tagopen `div`
* attributestart `style`
* text `color: `
* substitution : `#fff`
* attributeend: `style`
* tagopenend: `div`
* text: `\n `
* tagopen `span`
* attributestart `style`
* text `background-color: #fff`
* attributeend `style`
* tagopenend `span`
* substitution `test`
* text `text`
* tagclose `span`
* text `\n `
* tagclose `div`
* end

Comments and CDATA segments are also supported.
