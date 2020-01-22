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

import { LitElement, html } from "lit-element";
import { WithDependencies, DEPENDENCY_INFO } from "./../src/lib/with-dependencies.js";

describe('with-dependencies-test', () => {

  fit('basic-loading-test', async (done) => {
    class MyElement extends LitElement {
      render() {
        return html`test`;
      }
    }

    class RenderTest extends WithDependencies({ 'my-element': () => sleepWithElement(1000, MyElement) }, LitElement) {
      renderFallback() {
        return html`loading`;
      }

      renderContent() {
        return html`content`;
      }
    }
    window.customElements.define('render-tets', RenderTest);
    const element = new RenderTest();
    const element2 = new RenderTest();
    expect(RenderTest[DEPENDENCY_INFO].resolved).toBeFalse();
    expect(RenderTest[DEPENDENCY_INFO].resolving).toBeFalse();
    document.body.appendChild(element);
    await sleep(100);
    document.body.appendChild(element2);
    element['performUpdate']();
    expect(RenderTest[DEPENDENCY_INFO].resolved).toBeFalse();
    expect(RenderTest[DEPENDENCY_INFO].resolving).toBeTrue();
    expect(element.shadowRoot.textContent).toBe('loading');
    await sleep(1000);
    expect(RenderTest[DEPENDENCY_INFO].resolved).toBeTrue();
    expect(RenderTest[DEPENDENCY_INFO].resolving).toBeFalse();
    expect(element.shadowRoot.textContent).toBe('content');
    await sleep(1000);
    const element3 = new RenderTest();
    document.body.appendChild(element3);
    document.body.removeChild(element);
    document.body.removeChild(element2);
    document.body.removeChild(element3);
    done();
  }, 10000);
});

function sleepWithElement(ms: number, element: typeof HTMLElement): Promise<typeof HTMLElement> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(element);
    }, ms);
  });
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve();
    }, ms);
  });
}
