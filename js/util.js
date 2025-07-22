/**
 * Gets the first DOM element matching a selector or returns the element itself if already a DOM node.
 * @param {string|HTMLElement} selector - CSS selector or DOM element
 * @param {ParentNode} [context] - Optional context element for the query
 * @returns {HTMLElement|null} The matched element or null if not found
 */
export function $single(selector, context) {
    if (selector.tagName ?? false) {
        return selector;
    }
    return (context ? context : document).querySelector(selector);
}

/**
 * Gets all DOM elements matching a selector as a NodeList.
 * @param {string} selector - CSS selector
 * @param {ParentNode} [context] - Optional context element for the query
 * @returns {NodeList} List of matched elements
 */
export function $list(selector, context) {
    return (context ? context : document).querySelectorAll(selector);
}

/**
 * Applies a function to all elements matching a selector.
 * @param {string} selector - CSS selector
 * @param {function(HTMLElement):void} fnc - Function to execute for each element
 * @param {ParentNode} [context] - Optional context element for the query
 * @returns {NodeList} The original NodeList of matched elements
 */
export function $apply(selector, fnc, context) {
    const elems = $list(selector, context);
    if (typeof fnc == 'function') {
        Array.from(elems).forEach(el => fnc.call(el, el));
    }
    return elems;
}

/**
 * Gets the last DOM element matching a selector.
 * @param {string} selector - CSS selector
 * @param {ParentNode} [context] - Optional context element for the query
 * @returns {HTMLElement|undefined} The last matched element or undefined if none found
 */
export function $last(selector, context) {
    const list = $list(selector, context);
    return list[list.length - 1] ?? undefined;
}

/**
 * Inserts a node after a reference node in the DOM.
 * @param {Node} newNode - Node to be inserted
 * @param {Node} refNode - Reference node after which the new node will be inserted
 */
export function insertAfter(newNode, refNode) {
    if (refNode.parentNode) {
        if (refNode.nextSibling) {
            refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
        } else {
            refNode.parentNode.appendChild(newNode);
        }
    }
}

/**
 * Creates a DOM element with attributes and content.
 * @param {string} [tagName='div'] - HTML tag name
 * @param {Object} [attrs={}] - Object with attribute key-value pairs
 * @param {string|Node|Array<string|Node>} [content=''] - Text, HTML string, DOM node or array of contents
 * @returns {HTMLElement} The created element
 */
export function tag(tagName = 'div', attrs = {}, content = '') {
    const elem = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => elem.setAttribute(key, value));

    const appendContent = item => {
        if (typeof item === 'string') {
            const fragment = document.createRange().createContextualFragment(item);
            elem.appendChild(fragment);
        } else if (item instanceof Node) {
            elem.appendChild(item);
        }
    };

    if (Array.isArray(content)) {
        content.forEach(appendContent);
    } else {
        appendContent(content);
    }

    return elem;
}

/**
 * Creates a deep copy of an object via JSON serialization.
 * @param {Object} obj - Object to be cloned
 * @returns {Object} Deep copy of the original object
 */
export function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if a value is a plain object (not array, null, or special JS object).
 * @param {*} obj - Value to check
 * @returns {boolean} True if the value is a plain object
 */
export function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false;

    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
}

/**
 * Delegates events from a root element (like body) to matching selectors.
 * @param {string} selector - CSS selector to match against event targets
 * @param {string} eventName - Name of the event to listen for
 * @param {function(Event):void} callback - Function to execute when event occurs
 */
export function rootEvent(selector, eventName, callback) {
    document.body.addEventListener(eventName, async (event) => {
        if (event.target.matches(`${selector}, ${selector} *`)) {
            event.preventDefault();
            const elem = event.target.closest(selector);
            if (isAsyncFunction(callback)) {
                await callback.call(elem, event);
            } else {
                callback.call(elem, event);
            }
        }
    });
}

/**
 * Loads external CSS via <link>
 * @param {string|string[]} cssPaths - Path to CSS file/files
 * @returns {Promise<void[]>}
 */
export function loadCss(cssPaths) {
    const files = Array.isArray(cssPaths) ? cssPaths : [cssPaths];
    return Promise.all(files.map(href => new Promise((resolve, reject) => {
        const link = tag('link', { rel: 'stylesheet', href });
        link.onload = resolve;
        link.onerror = () => reject(new Error(`Falha ao carregar CSS: ${href}`));
        document.head.appendChild(link);
    })));
}

/**
 * Checks if a value is an async function or a Promise.
 * 
 * @param {*} fn - The value to check (can be function, Promise, or any type)
 * @returns {boolean} True if the value is an async function or Promise instance
 */
export function isAsyncFunction(fn) {
    return fn?.constructor?.name === 'AsyncFunction' || fn instanceof Promise;
}

/**
 * @param {Function} func - Função a ser executada após o delay
 * @param {number} wait - Tempo de espera em milissegundos
 * @param {boolean} immediate - Executar imediatamente na primeira chamada?
 * @returns {Function} Versão debounced da função
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

export function rgbToHex(rgbStr) {
    const match = rgbStr.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (!match) return rgbStr;

    const hexParts = match.slice(1, 4).map(value => {
        const int = parseInt(value, 10);
        if (int < 0 || int > 255) throw new Error(`Valor RGB inválido: ${int}. Deve ser entre 0 e 255.`);
        return int.toString(16).padStart(2, '0'); // Garante 2 dígitos
    });

    return `#${hexParts.join('')}`;
}

export function camelToNormal(text) {
    const withSpaces = text.replace(/([A-Z])/g, ' $1').toLowerCase();
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export async function importJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    return await response.json();
}

export function relToAbs(relUrl) {
    const urlBase = new URL(import.meta.url);
    return new URL(relUrl, urlBase).href;
}

/**
 * Checks if string represents a hex color
 * @param {string} val - Value to test
 * @returns {boolean} TRUE is is a color
 */
export function isColor(val) {
    return /^(#([a-f0-9]{6}|[a-f0-9]{3})|rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0\.\d+)\s*\))$/i.test(val.trim());
}

/**
 * Checks if string represents a date/time
 * @param {string} val - Value to test
 * @returns {string|false} Date type ('date', 'datetime-local', 'time') or false
 */
export function isDateTime(val) {
    if (typeof val === 'string') {
        if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(val)) {
            return 'date';
        }
        if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
            return 'datetime-local';
        }
        if (/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(val)) {
            return 'time';
        }
    }
    return false;
}