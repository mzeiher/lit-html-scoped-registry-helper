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

import { LitElement, TemplateResult } from 'lit-element/lit-element.js';

// symbol for accessing the dependency info object on a custom element constructor
export const DEPENDENCY_INFO = Symbol('getter at constructor'); // exported for test case

// symbol for accessing the dependency resolved state property on a custom element instance (could be ommitted by checking the DependencyInfo object)
export const DEPENDENCY_STATE_PROPERTY = Symbol('dependency state'); // exported for test case

/**
 * Information about resolved dependencies
 */
export interface DependencyInfo {
  resolved: boolean;
  resolving: boolean;
  scopedRegistry: ScopedRegistry;
  dependenciesResolvedPromise: Promise<void> | null;
  getParentInfo(): DependencyInfo; // possible static properties are not inherited when compiling to es5
}

/**
 * interface description for a lit-element object with dependencies
 */
export interface WithDependenciesType {
  readonly scopedHtml: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
  renderContent(): TemplateResult | void;
  renderFallback(): TemplateResult | void;
}

/**
 * scoped registry consists of key value tuples with type=tag and value either ar custom element constructor 
 * or a function which returns a promise to a custom element constructor (dynamic import)
 */
export type ScopedRegistry = { [tag: string]: typeof HTMLElement | (() => Promise<typeof HTMLElement>) };

/**
 * current state of the dependency object for the class
 */
enum DEPENDENCY_STATE {
  RESOLVED,
  INIT,
  RESOLVING,
}

/**
 * Mixin to enable lazy loading of dependencies
 * 
 * @example
 * class MyElement extends WithDependency({'my-element': async () => (await import('./infoelement.js)).InfoElement }, LitElement) {
 * 
 *  renderFallback() {
 *    return html`Loading...`
 *  }
 * 
 *  renderContent() {
 *    return this.scopedHtml`<my-element></my-element>`;
 *  }
 * }
 * 
 * @param registry scoped registry
 * @param baseClass base class (e.g LitElement)
 */
export const WithDependencies = function (registry: ScopedRegistry, baseClass: typeof LitElement) {
  const Clazz = class extends baseClass implements WithDependenciesType {

    /**
     * private property to access current state of dependencies (could be ommitted by checking DependencyInfo object on constructor)
     */
    private [DEPENDENCY_STATE_PROPERTY]: DEPENDENCY_STATE = DEPENDENCY_STATE.INIT;

    /**
     * get scoped html template tag with resolved dependencies
     */
    get scopedHtml(): (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult {
      return null;
    }

    /**
     * override for LitElement render() method
     */
    render(): TemplateResult | void {
      switch (this[DEPENDENCY_STATE_PROPERTY]) {
        case DEPENDENCY_STATE.RESOLVED:
          return this.renderContent();
        case DEPENDENCY_STATE.RESOLVING:
          return this.renderFallback();
        case DEPENDENCY_STATE.INIT:
        default:
          return resolveDependency.apply(this); // resolve dependencies
      }
    }

    /**
     * renderer when dependencies are resolved
     */
    renderContent(): TemplateResult | void {
      return null;
    }

    /**
     * fallback renderer while dependencies are resolving
     */
    renderFallback(): TemplateResult | void {
      return null;
    }
  }

  // get dependencies of parent (if applicable) dependency resolution will resolve the inheritance graph starting with current class
  const parentDependencies = baseClass[DEPENDENCY_INFO] ? baseClass[DEPENDENCY_INFO] : null;


  const dependencyInfo: DependencyInfo = {
    resolved: false,
    resolving: false,
    dependenciesResolvedPromise: null,
    scopedRegistry: registry,
    getParentInfo() {
      return parentDependencies;
    }
  }

  // define static property on constructor, !!! Warning this will not work on es5 (static properties will not be inherited)
  Object.defineProperty(Clazz, DEPENDENCY_INFO, { enumerable: false, configurable: true, get: function () { return dependencyInfo } });
  return Clazz;
}

/**
 * this function will resolve all dependencies
 */
function resolveDependency(this: WithDependenciesType & LitElement) {
  const dependencyInfo: DependencyInfo = this.constructor[DEPENDENCY_INFO]; // get DependencyInfo object
  // if the dependencies are already resolved set instance state to RESOLVED and return content
  if (dependencyInfo.resolved) {
    this[DEPENDENCY_STATE_PROPERTY] = DEPENDENCY_STATE.RESOLVED;
    return this.renderContent();
  // if the dependencies are currently resolving (could be triggerd by rendering another instance) subscribe to the promise
  // which will resolve once the dependencies are resolved and render fallback
  } else if (dependencyInfo.resolving) { 
    this[DEPENDENCY_STATE_PROPERTY] = DEPENDENCY_STATE.RESOLVING;
    dependencyInfo.dependenciesResolvedPromise.then(() => {
      this[DEPENDENCY_STATE_PROPERTY] = DEPENDENCY_STATE.RESOLVED;
      (this as any).performUpdate(); // tell lit-html to re-render since dependencies are resolved
    })
    return this.renderFallback();
  // dependencies not yet resolved, start resolving them (start with current class and go down the inheritance graph)
  } else { 
    this[DEPENDENCY_STATE_PROPERTY] = DEPENDENCY_STATE.RESOLVING;
    dependencyInfo.resolving = true;
    let resolveCallback = null;
    // create promise which will be resolved once the dependencies are loaded
    dependencyInfo.dependenciesResolvedPromise = new Promise((resolve) => {
      resolveCallback = resolve;
    });
    // register to promise to trigger a re-render of the LitElement
    dependencyInfo.dependenciesResolvedPromise.then(() => {
      this[DEPENDENCY_STATE_PROPERTY] = DEPENDENCY_STATE.RESOLVED;
      (this as any).performUpdate();
    });
    // Start resolving dependencies, start with current class and go down the inheritance tree defer it to microtask
    Promise.resolve().then(async () => {
      let parentDependencyInfo = dependencyInfo;
      // this array will hold all promises from DependencyInfo or dynamic imports
      const dynamicImportsOrResolvingPromises: Array<Promise<unknown>> = [];
      // iterate through the inheritance graph (starting with current class and go down to super...)
      while (parentDependencyInfo !== null) { // resolve parent infos
         // resolve if the DependencyInfo object ist the one from the current class or from a super class and not yet resolved
        if (parentDependencyInfo === parentDependencyInfo || parentDependencyInfo.resolved === false) {
          // iterate through the scopedRegistry object and find functions (we just assume these function will return a promise which resolve to a custom element)
          for (const [key, value] of Object.entries(dependencyInfo.scopedRegistry)) {
            if (!HTMLElement.isPrototypeOf(value) && typeof value === 'function') { // assume we have a function which returns a promise
              ((dependencyInfo, key, value) => { // catch current DependencyInfo object, the key and the value in an iif closure
                dynamicImportsOrResolvingPromises.push((value as () => Promise<typeof HTMLElement>)().then((element) => {
                  return { depInfo: dependencyInfo, key, element };
                })); // execute the function and append the corresponding DependencyInfo object, the key and the promise which will resolve to a custom element
              })(parentDependencyInfo, key, value);
            }
          }
        // if the current DependencyInfo object is resolving (triggerd through another render of another element) add the promise which will resolve
        // once the dependency is resolved
        } else if (parentDependencyInfo.resolving) {
          dynamicImportsOrResolvingPromises.push(parentDependencyInfo.dependenciesResolvedPromise);
          break; // break the loop, we can assume that once the dependency is resolved, the super dependencies are also resolved
        }
        // get dependencies of the super class
        parentDependencyInfo = parentDependencyInfo.getParentInfo();
      }
      // wait until all sub-dependencies and dynamic imports are resolved
      (await Promise.all(dynamicImportsOrResolvingPromises)).forEach((value: void | {depInfo: DependencyInfo; key: string; element: typeof HTMLElement}) => {
        if(typeof value === 'object') { // if the promise resolves to an object, replace the function in the scopedRegistry with the custom lelement on the specified key
          value.depInfo.resolved = true;
          value.depInfo.scopedRegistry[value.key] = value.element;
          value.depInfo.resolving = false;
        }
      });
      resolveCallback(); // trigger the resolving promise to signal the dependencies are resolved
    });
    return this.renderFallback();
  }
}
