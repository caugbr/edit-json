function $single(selector, context) {
    if (selector.tagName ?? false) {
        return selector;
    }
    return (context ? context : document).querySelector(selector);
}

function $list(selector, context) {
    return (context ? context : document).querySelectorAll(selector);
}

function $last(selector, context) {
    const list = $list(selector, context);
    return list[list.length - 1] ?? undefined;
}

function $apply(selector, fnc, context) {
    const elems = $list(selector, context);
    if (typeof fnc == 'function') {
        Array.from(elems).forEach(el => fnc.call(el, el));
    }
    return elems;
}

function insertAfter(newNode, refNode) {
    if (refNode.parentNode) {
        if (refNode.nextSibling) {
            refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
        } else {
            refNode.parentNode.appendChild(newNode);
        }
    }
}

function tag(tagName = 'div', attrs = {}, content = '') {
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

function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false;

  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}


// function rootEvent(selector, eventName, callback) {
//     document.body.addEventListener(eventName, event => {
//         if (event.target.matches(`${selector}, ${selector} *`)) {
//             const elem = event.target.closest(selector);
//             callback.call(elem, event);
//         }
//     })
// }
function rootEvent(selector, eventName, callback) {
    document.body.addEventListener(eventName, async (event) => {
        if (event.target.matches(`${selector}, ${selector} *`)) {
            const elem = event.target.closest(selector);
            console.log('NAME', callback.constructor.name)
            const isAsync = callback.constructor.name === 'AsyncFunction';
            event.preventDefault();
            if (isAsync) {
                await callback.call(elem, event);
            } else {
                callback.call(elem, event);
            }
        }
    });
}
