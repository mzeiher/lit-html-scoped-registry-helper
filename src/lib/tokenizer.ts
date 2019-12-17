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

enum STATE {
  DATA,
  TAG_OPEN,
  COMMENT,
  TAG_NAME,
  TAG,
  ERROR,
  ATTRIBUTE_START,
  TAG_CLOSE,
  ATTRIBUTE,
  ATTRIBUTE_CONTENT,
  ATTRIBUTE_CONTENT_START,
  CDATA,
}

const CHARACTER_LESS_THAN = '<';
const CHARACTER_COMMENT_START = '!--';
const CHARACTER_COMMENT_END = '-->';
const CHARACTER_SLASH = '/';
const CHARACTER_GREATER_THAN = '>';
const CHARACTER_SPACE = ' ';
const CHARACTER_EQUAL = '=';
const CHARACTER_CDATA_START = '![CDATA[';
const CHARACTER_CDATA_END = ']]>';

const ASCII_ALPHA_WITH_DASH = /[a-zA-Z-]/;
const ASCII_QUOTE_DOUBLE_QUOTE = /['"]/;

//TODO: move state handling into tokenizer instance
let CURRENT_STATE = STATE.DATA;

let CURRENT_TAG: unknown = '';
let CURRENT_ATTRIBUTE = '';
let ATTRIBUTE_QUOTESTYLE = ' '; // default quote style is space (no quotes)
let DATA_BUFFER = '';

export interface EventType {
  'tagopen': unknown;
  'tagopenend': unknown;
  'data': string;
  'attributestart': string;
  'attributeend': string;
  'substitution': unknown;
  'commentstart': string;
  'commentend': string;
  'text': string;
  'start': string;
  'end': string;
  'tagclose': unknown;
  'error': string;
  'cdatastart': string;
  'cdataend': string;
}

type EventEmitter = {
  emit<T extends keyof EventType>(type: T, data: EventType[T]);
}

function createEventEmitter() {
  return {
    callbacks: {},
    handler: [],
    on: function <T extends keyof EventType>(type: T, callback: (data: EventType[T]) => void) {
      (this.callbacks[type] || (this.callbacks[type] = [])).push(callback);
    },
    emit: function <T extends keyof EventType>(type: T, data: EventType[T]) {
      (this.callbacks[type] || []).forEach(callback => {
        callback(data);
      });
      this.handler.forEach(callback => {
        callback(type, data);
      });
    },
    off: function (callback: (data: unknown) => void) {
      Object.keys(this.callbacks).forEach((value) => {
        callback[value] = callback[value].filter(value => {
          return value !== callback;
        });
      })
    }
  }
}

function parseData(offset: number, string: string, eventEmitter: EventEmitter): number {
  switch (string.charAt(offset)) {
    case CHARACTER_LESS_THAN:
      if (DATA_BUFFER !== '') {
        eventEmitter.emit('text', DATA_BUFFER);
      }
      CURRENT_STATE = STATE.TAG_OPEN;
      DATA_BUFFER = '';
      return 1;
    default:
      DATA_BUFFER += string.charAt(offset);
      return 1;
  }
}

function parseTagOpen(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.substr(offset, 3) === CHARACTER_COMMENT_START) {
    eventEmitter.emit('commentstart', '');
    CURRENT_STATE = STATE.COMMENT;
    return 3;
  } else if (string.substr(offset, 8) === CHARACTER_CDATA_START) {
    eventEmitter.emit('cdatastart', '');
    CURRENT_STATE = STATE.CDATA;
    DATA_BUFFER = '';
    return 8;
  } else if (ASCII_ALPHA_WITH_DASH.test(string.charAt(offset))) {
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.TAG_NAME;
    return 0;
  } else if (string.charAt(offset) === CHARACTER_SLASH) {
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.TAG;
    return 0;
  } else if (string.charAt(offset) === CHARACTER_LESS_THAN) {
    CURRENT_STATE = STATE.ERROR;
    return 0;
  } else {
    return 1; // do nothing until there is a non-whitespace token (to allow < div >)
  }
}

function parseCDATA(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.substr(offset, 3) === CHARACTER_CDATA_END) {
    eventEmitter.emit('text', DATA_BUFFER);
    eventEmitter.emit('cdataend', '');
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.DATA;
    return 3;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

function parseTagName(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (ASCII_ALPHA_WITH_DASH.test(string.charAt(offset))) {
    DATA_BUFFER += string.charAt(offset); // gather tag name
    return 1;
  } else {
    eventEmitter.emit('tagopen', DATA_BUFFER);
    CURRENT_TAG = DATA_BUFFER;
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.TAG;
    if (string.charAt(offset) === CHARACTER_GREATER_THAN) {
      return 0;
    } else {
      return 1;
    }
  }
}

function parseTag(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) === CHARACTER_SLASH) {
    if (CURRENT_TAG) { // this is the case on closing tags <div />
      eventEmitter.emit('tagopenend', CURRENT_TAG);
    }
    CURRENT_STATE = STATE.TAG_CLOSE;
    return 1;
  } else if (string.charAt(offset) === CHARACTER_GREATER_THAN) {
    eventEmitter.emit('tagopenend', CURRENT_TAG);
    CURRENT_STATE = STATE.DATA;
    CURRENT_TAG = ''; // cleanup
    DATA_BUFFER = ''; // cleanup
    return 1;
  } else if (string.charAt(offset) !== CHARACTER_SPACE) {
    CURRENT_STATE = STATE.ATTRIBUTE_START;
    DATA_BUFFER = '';
    return 0;
  } else {
    return 1;
  }
}

function parseComment(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.substr(offset, 3) === CHARACTER_COMMENT_END) {
    eventEmitter.emit('text', DATA_BUFFER);
    eventEmitter.emit('commentend', '');
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.DATA;
    return 3;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

function parseAttributeStart(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) === CHARACTER_EQUAL) {
    eventEmitter.emit('attributestart', DATA_BUFFER);
    CURRENT_ATTRIBUTE = DATA_BUFFER;
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.ATTRIBUTE;
    return 0;
  } else if (string.charAt(offset) === CHARACTER_SPACE) {
    eventEmitter.emit('attributestart', DATA_BUFFER);
    CURRENT_ATTRIBUTE = DATA_BUFFER;
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.ATTRIBUTE;
    return 1;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

function parseAttribute(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) === CHARACTER_SPACE) {
    return 1;
  } else if (string.charAt(offset) === CHARACTER_EQUAL) {
    CURRENT_STATE = STATE.ATTRIBUTE_CONTENT_START;
    return 1;
  } else {
    eventEmitter.emit('attributeend', CURRENT_ATTRIBUTE);
    CURRENT_STATE = STATE.TAG;
    CURRENT_ATTRIBUTE = '';
    DATA_BUFFER = '';
    return 0;
  }
}

function parseAttributeContentStart(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) === CHARACTER_SPACE) {
    return 1;
  } else if (ASCII_QUOTE_DOUBLE_QUOTE.test(string.charAt(offset))) {
    ATTRIBUTE_QUOTESTYLE = string.charAt(offset);
    CURRENT_STATE = STATE.ATTRIBUTE_CONTENT;
    return 1;
  } else if (string.charAt(offset) === CHARACTER_SLASH || string.charAt(offset) === CHARACTER_GREATER_THAN) {
    eventEmitter.emit('text', DATA_BUFFER);
    eventEmitter.emit('attributeend', CURRENT_ATTRIBUTE);
    DATA_BUFFER = '';
    CURRENT_ATTRIBUTE = '';
    CURRENT_STATE = STATE.TAG;
    return 0;
  } else { // we're at a boundary or have a character -> assume space as attribute quote style
    ATTRIBUTE_QUOTESTYLE = ' ';
    CURRENT_STATE = STATE.ATTRIBUTE_CONTENT;
    return 0;
  }
}

function parseAttributeContent(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) !== ATTRIBUTE_QUOTESTYLE) {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  } else {
    eventEmitter.emit('text', DATA_BUFFER);
    eventEmitter.emit('attributeend', CURRENT_ATTRIBUTE);
    DATA_BUFFER = '';
    CURRENT_ATTRIBUTE = '';
    CURRENT_STATE = STATE.TAG;
    return 1;
  }
}

function parseTagClose(offset: number, string: string, eventEmitter: EventEmitter): number {
  if (string.charAt(offset) === CHARACTER_GREATER_THAN) {
    eventEmitter.emit('tagclose', DATA_BUFFER || CURRENT_TAG);
    DATA_BUFFER = '';
    CURRENT_TAG = '';
    CURRENT_STATE = STATE.DATA;
    return 1;
  } else if (string.charAt(offset) === CHARACTER_SPACE) { // handle < div / > or < / div >
    return 1;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

export function tokenizer(strings: TemplateStringsArray, ...placeholder: unknown[]) {
  const eventEmitter = createEventEmitter();
  return {
    on: <T extends keyof EventType>(type: T, callback: (data: EventType[T]) => void) => { eventEmitter.on(type, callback); },
    off: (callback) => { eventEmitter.off(callback); },
    addHandler: <T extends keyof EventType>(callback: (type: T, data: EventType[T]) => void): void => {
      eventEmitter.handler.push(callback);
    },
    parse: function () {
      CURRENT_STATE = STATE.DATA as STATE;
      DATA_BUFFER = '';
      eventEmitter.emit('start', '');
      for (let i = 0; i < strings.length; i++) {
        const currentSubString = strings[i];
        let offset = 0;
        while (currentSubString.length > offset) {
          switch (CURRENT_STATE) {
            case STATE.DATA:
              offset += parseData(offset, currentSubString, eventEmitter);
              break;
            case STATE.TAG_OPEN:
              offset += parseTagOpen(offset, currentSubString, eventEmitter);
              break;
            case STATE.TAG_NAME:
              offset += parseTagName(offset, currentSubString, eventEmitter);
              break;
            case STATE.CDATA:
              offset += parseCDATA(offset, currentSubString, eventEmitter);
              break;
            case STATE.COMMENT:
              offset += parseComment(offset, currentSubString, eventEmitter);
              break;
            case STATE.TAG:
              offset += parseTag(offset, currentSubString, eventEmitter);
              break;
            case STATE.ATTRIBUTE_START:
              offset += parseAttributeStart(offset, currentSubString, eventEmitter);
              break;
            case STATE.ATTRIBUTE:
              offset += parseAttribute(offset, currentSubString, eventEmitter);
              break;
            case STATE.ATTRIBUTE_CONTENT_START:
              offset += parseAttributeContentStart(offset, currentSubString, eventEmitter);
              break;
            case STATE.ATTRIBUTE_CONTENT:
              offset += parseAttributeContent(offset, currentSubString, eventEmitter);
              break;
            case STATE.TAG_CLOSE:
              offset += parseTagClose(offset, currentSubString, eventEmitter);
              break;
            case STATE.ERROR:
              eventEmitter.emit('error', `invalid token ${currentSubString.charAt(offset)} at position ${offset} of sub-string ${currentSubString}`);
              return;
          }
        }
        if (i < strings.length - 1) { // we're at a tagged template literal boundry
          if (CURRENT_STATE === STATE.DATA ||
              CURRENT_STATE === STATE.CDATA ||
              CURRENT_STATE === STATE.COMMENT ||
              CURRENT_STATE === STATE.ATTRIBUTE_CONTENT) { // we're in DATA or CDATA or COMMENT or ATTRIBUTE_CONTENT state, so the substitution will be within a text-node, emit current text
            eventEmitter.emit('text', DATA_BUFFER);
            DATA_BUFFER = '';
            eventEmitter.emit('substitution', placeholder[i]); // emit substitution
          } else if (CURRENT_STATE === STATE.ATTRIBUTE_CONTENT_START) { // we have a substiution without quotes in attribute -> jump to STATE.ATTRIBUTE_CONTENT and emit current DATA_BUFFER (always empty)
            eventEmitter.emit('text', DATA_BUFFER);
            DATA_BUFFER = '';
            ATTRIBUTE_QUOTESTYLE = ' ';
            CURRENT_STATE = STATE.ATTRIBUTE_CONTENT;
            eventEmitter.emit('substitution', placeholder[i]); // emit substitution
          } else if (CURRENT_STATE === STATE.TAG_OPEN) { // if placeholder is tag name <${MyObject} /> in this case don't emit substitution -> substitution is in tagName
            eventEmitter.emit('tagopen', placeholder[i]);
            CURRENT_STATE = STATE.TAG
            CURRENT_TAG = placeholder[i];
            DATA_BUFFER = '';
          } else if (CURRENT_STATE === STATE.TAG_CLOSE) { // if placeholder is in clos tag <${Tag}></${Tag}> -> in this case don't emit substitution -> substitution is in tagName
            CURRENT_TAG = placeholder[i];
            DATA_BUFFER = '';
          }
        }
      }
      if (DATA_BUFFER !== '') { // we're at the end of the last template string -> emit content in DATA_BUFFER as text node
        eventEmitter.emit('text', DATA_BUFFER);
        DATA_BUFFER = '';
      }
      if (CURRENT_STATE !== STATE.DATA) { // we should be in data state at the end, if not the string was malformed
        eventEmitter.emit('error', 'malformed xhtml');
      }
      eventEmitter.emit('end', '');
    }
  }
}
