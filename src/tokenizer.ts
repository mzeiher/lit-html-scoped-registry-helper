const enum STATE {
  DATA,
  TAG_OPEN,
  COMMENT,
  TAG,
  ERROR,
  ATTRIBUTE_START,
  TAG_CLOSE,
  ATTRIBUTE,
  ATTRIBUTE_CONTENT,
  ATTRIBUTE_CONTENT_START,
}

const CHARACTER_LESS_THAN = '<';
const CHARACTER_COMMENT_START = '!--';
const CHARACTER_COMMENT_END = '-->';
const CHARACTER_SLASH = '/';
const CHARACTER_GREATER_THAN = '>';
const CHARACTER_SPACE = ' ';
const CHARACTER_EQUAL = '=';

const ASCII_ALPHA_WITH_DASH = /[a-zA-Z\-]/;
const ASCII_QUOTE_DOUBLE_QUOTE = /['"]/;

let CURRENT_STATE = STATE.DATA;

let CURRENT_TAG = '';
let CURRENT_ATTRIBUTE = '';
let ATTRIBUTE_QUOTESTYLE = ' '; // default quote style is space (no quotes)
let DATA_BUFFER = '';

export interface EventType {
  'tagopen': string;
  'data': string;
  'attributestart': string;
  'attributeend': string;
  'substitution': unknown;
  'comment': string;
  'text': string;
  'start': string;
  'end': string;
  'cdata': string;
  'tagclose': string;
  'error': string;
}

export type EventEmitter = {
  emit<T extends keyof EventType>(type: T, data: EventType[T]);
}

function createEventEmitter() {
  return {
    callbacks: {},
    handler: [],
    on: function<T extends keyof EventType>(type: T, callback: (data: EventType[T]) => void) {
      (this.callbacks[type] || (this.callbacks[type] = [])).push(callback);
    },
    emit: function<T extends keyof EventType>(type: T, data: EventType[T]) {
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
};

function parseData(offset: number, string: string, eventEmitter: EventEmitter) {
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

function parseTagOpen(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.substr(offset, 3) === CHARACTER_COMMENT_START) {
    CURRENT_STATE = STATE.COMMENT;
    return 3;
  } else if (ASCII_ALPHA_WITH_DASH.test(string.charAt(offset))) {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  } else if (string.charAt(offset) === CHARACTER_SLASH) {
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.TAG;
    return 0;
  } else if(string.charAt(offset) === CHARACTER_LESS_THAN) {
    CURRENT_STATE = STATE.ERROR;
    return 0;
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

function parseTag(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.charAt(offset) === CHARACTER_SLASH) {
    CURRENT_STATE = STATE.TAG_CLOSE;
    return 1;
  } else if (string.charAt(offset) === CHARACTER_GREATER_THAN) {
    CURRENT_STATE = STATE.DATA;
    return 1;
  } else if (string.charAt(offset) !== CHARACTER_SPACE) {
    CURRENT_STATE = STATE.ATTRIBUTE_START;
    DATA_BUFFER = '';
    return 0;
  } else {
    return 1;
  }
}

function parseComment(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.substr(offset, 3) === CHARACTER_COMMENT_END) {
    eventEmitter.emit('comment', DATA_BUFFER);
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.DATA;
    return 3;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

function parseAttributeStart(offset: number, string: string, eventEmitter: EventEmitter) {
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

function parseAttribute(offset: number, string: string, eventEmitter: EventEmitter) {
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

function parseAttributeContentStart(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.charAt(offset) === CHARACTER_SPACE) {
    return 1;
  } else if (ASCII_QUOTE_DOUBLE_QUOTE.test(string.charAt(offset))) {
    ATTRIBUTE_QUOTESTYLE = string.charAt(offset);
    CURRENT_STATE = STATE.ATTRIBUTE_CONTENT;
    return 1;
  } else { // we're at a boundary or have a character -> assume space as attribute quote style
    ATTRIBUTE_QUOTESTYLE = ' ';
    CURRENT_STATE = STATE.ATTRIBUTE_CONTENT;
    return 1;
  }
}

function parseAttributeContent(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.charAt(offset) !== ATTRIBUTE_QUOTESTYLE) {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  } else {
    if (offset !== 0) { // emit DATA_BUFFER not if attribute closes directly after substitution
      eventEmitter.emit('text', DATA_BUFFER);
    }
    eventEmitter.emit('attributeend', CURRENT_ATTRIBUTE);
    DATA_BUFFER = '';
    CURRENT_ATTRIBUTE = '';
    CURRENT_STATE = STATE.TAG;
    return 1;
  }
}

function parseTagClose(offset: number, string: string, eventEmitter: EventEmitter) {
  if (string.charAt(offset) === CHARACTER_GREATER_THAN) {
    eventEmitter.emit('tagclose', DATA_BUFFER || CURRENT_TAG);
    DATA_BUFFER = '';
    CURRENT_STATE = STATE.DATA;
    return 1;
  } else {
    DATA_BUFFER += string.charAt(offset);
    return 1;
  }
}

export function parser(strings: TemplateStringsArray, ...placeholder: unknown[]) {
  const eventEmitter = createEventEmitter();
  return {
    on: (type, callback) => {eventEmitter.on(type, callback);},
    off: (callback) => {eventEmitter.off(callback);},
    parse: function () {
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
          if (CURRENT_STATE === STATE.DATA) { // we're in DATA state, so the substitution will be within a text-node, emit current text
            eventEmitter.emit('text', DATA_BUFFER);
            DATA_BUFFER = '';
          } else if (CURRENT_STATE === STATE.COMMENT) { // we're in comment state, emit current comment
            eventEmitter.emit('comment', DATA_BUFFER);
            DATA_BUFFER = '';
          } else if(CURRENT_STATE === STATE.ATTRIBUTE_CONTENT) {
            eventEmitter.emit('text', DATA_BUFFER);
            DATA_BUFFER = '';
          }
          eventEmitter.emit('substitution', placeholder[i]); // emit substitution
        }
      }
      if (DATA_BUFFER !== '') { // we're at the end emit content in DATA_BUFFER as text node
        eventEmitter.emit('text', DATA_BUFFER);
      }
      eventEmitter.emit('end', '');
    }
  }
};
