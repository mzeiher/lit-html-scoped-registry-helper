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
 * (c) darionco https://gist.github.com/darionco/823817008596bb7a518821e7b8201478
 */
import { html, TemplateResult } from 'lit-html/lit-html.js';
import { getCustomElementTagName } from './custom-element-cache.js';

interface CachedNeedlessValue {
  value: unknown;
  index: number;
}

interface CachedTemplateStrings {
  strings: TemplateStringsArray;
  needlessValues: CachedNeedlessValue[];
}

function dropIndices(arr: unknown[], needlessValues: CachedNeedlessValue[]): unknown[] {
  const newArr = [];
  let j = 0;

  for (let i = 0, n = arr.length; i < n; ++i) {
    if (needlessValues[j].index === i) {
      ++j;
    } else {
      newArr.push(arr[i]);
    }
  }

  return newArr;
}

const templateStringsCache = new WeakMap<TemplateStringsArray, CachedTemplateStrings[]>();

// Convert dynamic tags to template strings
// example: <${'div'}>${'this is example'}</${'div'}> => <div>${'this is example'}</div>
export function preHTML(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult {
  // check cache !important return equal link at first argument
  let cachedStrings = templateStringsCache.get(strings) as CachedTemplateStrings[];
  if (cachedStrings) {
    for (let i = 0, n = cachedStrings.length; i < n; ++i) {
      const needlessValues = cachedStrings[i].needlessValues;
      let isSame = true;
      for (let ii = 0, nn = needlessValues.length; ii < nn; ++ii) {
        if (values[needlessValues[ii].index] !== needlessValues[ii].value) {
          isSame = false;
          break;
        }
      }

      if (isSame) {
        return html(
          cachedStrings[i].strings as TemplateStringsArray,
          ...dropIndices(values, needlessValues)
        );
      }
    }
  }

  const needlessValues: CachedNeedlessValue[] = [];
  const newStrings: string[] = [];

  let str: string;
  for (let i = 0, n = strings.length; i < n; ++i) {
    str = strings[i];

    while (
      str[str.length - 1] === '<' // open tag
      || (str[str.length - 2] === '<' && str[str.length - 1] === '/') // close tag
    ) {
      if (!HTMLElement.isPrototypeOf(values[i]) && typeof values[i] !== 'string') { /* eslint-disable-line */
        throw new Error('Only CustomElements or strings allowed in tag substitution')
      }
      needlessValues.push({
        value: values[i],
        index: i,
      });
      str += (typeof values[i] === 'string' ? values[i] : getCustomElementTagName(values[i] as typeof HTMLElement, '')) + strings[++i];
    }

    newStrings.push(str);
  }

  if (!cachedStrings) {
    cachedStrings = [];
    templateStringsCache.set(strings, cachedStrings);
  }

  const templateStringArray = makeTemplateString(newStrings);
  cachedStrings.push({
    strings: templateStringArray,
    needlessValues,
  });

  return html(templateStringArray, ...dropIndices(values, needlessValues));
}

const cache = {};
const createTemplate = (template) => {
  const clone = JSON.parse(JSON.stringify(template)); // the fastest clone :)
  Object.defineProperty(clone, 'raw', { value: clone });
  return cache[template.join('@')] = Object.freeze(template) as unknown as TemplateStringsArray;
}
export function makeTemplateString(template: Array<string>): TemplateStringsArray {
  return cache[template.join('@')] || createTemplate(template);
}
