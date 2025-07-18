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