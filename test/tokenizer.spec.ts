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

import { tokenizer } from './../src/lib/tokenizer.js';

describe('tokenizer tests', () => {

  it('simple tag', () => {
    const parser = tokenizer`<div></div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('self closing tag', () => {
    const parser = tokenizer`<div />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('multiple tags in row', () => {
    const parser = tokenizer`<div /><div></div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('mutliple tags with whitespace', () => {
    const parser = tokenizer`
    <div />
    <div></div>
    `;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "text", "data": "\n    " },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "text", "data": "\n    " },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "text", "data": "\n    " },
      { "type": "end", "data": "" }]);
  });

  it('whitespace comment and tag', () => {
    const parser = tokenizer`
    <div />
    <!-- test -->
    <div></div>
    `;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "text", "data": "\n    " },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "text", "data": "\n    " },
      { "type": "commentstart", "data": "" },
      { "type": "text", "data": " test " },
      { "type": "commentend", "data": "" },
      { "type": "text", "data": "\n    " },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "text", "data": "\n    " },
      { "type": "end", "data": "" }]);
  });

  it('nested tags with text', () => {
    const parser = tokenizer`<div><span>test</span></div><div></div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagopen", "data": "span" },
      { "type": "tagopenend", "data": "span" },
      { "type": "text", "data": "test" },
      { "type": "tagclose", "data": "span" },
      { "type": "tagclose", "data": "div" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('tag with substitution', () => {
    const parser = tokenizer`<div>${'test'}</div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('tags with substitution', () => {
    const parser = tokenizer`<div>${'test'}<span>${'test'}</span></div><div>${'test'}</div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "tagopen", "data": "span" },
      { "type": "tagopenend", "data": "span" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "tagclose", "data": "span" },
      { "type": "tagclose", "data": "div" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('comment with substitution', () => {
    const parser = tokenizer`<!-- test ${'test'} test -->`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "commentstart", "data": "" },
      { "type": "text", "data": " test " },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": " test " },
      { "type": "commentend", "data": "" },
      { "type": "end", "data": "" }]);
  });

  it('boolen attribute', () => {
    const parser = tokenizer`<div attribute />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('attribute with single quotes', () => {
    const parser = tokenizer`<div attribute='' />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with double quotes', () => {
    const parser = tokenizer`<div attribute="" />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute without quotes', () => {
    const parser = tokenizer`<div attribute= />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with single quotes and content', () => {
    const parser = tokenizer`<div attribute = 'test' />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "test" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with double quotes and content', () => {
    const parser = tokenizer`<div attribute = "test" />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "test" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute without quotes and content', () => {
    const parser = tokenizer`<div attribute = test />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "test" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with single quotes and substitution', () => {
    const parser = tokenizer`<div attribute = '${'test'}' />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with double quotes and substitution', () => {
    const parser = tokenizer`<div attribute = "${'test'}" />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute without quotes and substitution', () => {
    const parser = tokenizer`<div attribute = ${'test'} />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "attributestart", "data": "attribute" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attribute" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with single quotes and multiple substitutions', () => {
    const parser = tokenizer`<div attributestart = '${'test'}start' attributeend = 'end${'test'}' attributemiddle = 'start${'test'}end' attributestartend = '${'test'}middle${'test'}' />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },

      { "type": "attributestart", "data": "attributestart" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "start" },
      { "type": "attributeend", "data": "attributestart" },

      { "type": "attributestart", "data": "attributeend" },
      { "type": "text", "data": "end" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributeend" },

      { "type": "attributestart", "data": "attributemiddle" },
      { "type": "text", "data": "start" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "end" },
      { "type": "attributeend", "data": "attributemiddle" },

      { "type": "attributestart", "data": "attributestartend" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "middle" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributestartend" },

      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute with double quotes and multiple substitutions', () => {
    const parser = tokenizer`<div attributestart = "${'test'}start" attributeend = "end${'test'}" attributemiddle = "start${'test'}end" attributestartend = "${'test'}middle${'test'}" />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },

      { "type": "attributestart", "data": "attributestart" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "start" },
      { "type": "attributeend", "data": "attributestart" },

      { "type": "attributestart", "data": "attributeend" },
      { "type": "text", "data": "end" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributeend" },

      { "type": "attributestart", "data": "attributemiddle" },
      { "type": "text", "data": "start" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "end" },
      { "type": "attributeend", "data": "attributemiddle" },

      { "type": "attributestart", "data": "attributestartend" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "middle" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributestartend" },

      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);
  });

  it('attribute without quotes and multiple substitutions', () => {
    const parser = tokenizer`<div attributestart = ${'test'}start attributeend = end${'test'} attributemiddle = start${'test'}end attributestartend = ${'test'}middle${'test'} />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },

      { "type": "attributestart", "data": "attributestart" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "start" },
      { "type": "attributeend", "data": "attributestart" },

      { "type": "attributestart", "data": "attributeend" },
      { "type": "text", "data": "end" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributeend" },

      { "type": "attributestart", "data": "attributemiddle" },
      { "type": "text", "data": "start" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "end" },
      { "type": "attributeend", "data": "attributemiddle" },

      { "type": "attributestart", "data": "attributestartend" },
      { "type": "text", "data": "" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "middle" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": "" },
      { "type": "attributeend", "data": "attributestartend" },

      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }
    ]);


  });

  it('self-closing-tag with whitespaces', () => {
    const parser = tokenizer`< div / >`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" },
    ]);
  });

  it('tag with whitespaces', () => {
    const parser = tokenizer`< div >< / div >`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" },
    ]);
  });

  it('self closing substituted tag', () => {
    const parser = tokenizer`<${'div'} />`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('substituted tag', () => {
    const parser = tokenizer`<${'div'}></${'div'}>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('CDATA tag', () => {
    const parser = tokenizer`<div><![CDATA[test <>]]></div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "cdatastart", "data": "" },
      { "type": "text", "data": "test <>" },
      { "type": "cdataend", "data": "" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });

  it('CDATA tag with substitution', () => {
    const parser = tokenizer`<div><![CDATA[test <${'test'}>]]></div>`;
    const token = [];
    parser.addHandler((type, data) => {
      token.push({ type, data });
    });
    parser.parse();
    expect(token).toEqual([
      { "type": "start", "data": "" },
      { "type": "tagopen", "data": "div" },
      { "type": "tagopenend", "data": "div" },
      { "type": "cdatastart", "data": "" },
      { "type": "text", "data": "test <" },
      { "type": "substitution", "data": "test" },
      { "type": "text", "data": ">" },
      { "type": "cdataend", "data": "" },
      { "type": "tagclose", "data": "div" },
      { "type": "end", "data": "" }]);
  });
});
