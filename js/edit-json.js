// import '../css/edit-json.css';
import Popup from './popup.js';
import { $single, $apply, tag, isPlainObject, rootEvent } from './util.js';

/**
 * Classe para edição interativa de JSON em uma interface popup
 * @author Cau Guanabara <cauguanabara@gmail.com>
 * @class
 */
class EditJSON {    
    /** @type {string} Unique editor identifier */
    id = '';

    /** @type {string} Original JSON text */
    jsonText = '';

    /** @type {Object|Array|null} Parsed JSON data */
    jsonData = null;

    /** @type {HTMLElement|null} Text element containing JSON */
    jsonElement = null;

    /** @type {HTMLElement|null} HTML editor element */
    htmlElement = null;

    /** @type {Popup|null} Popup instance */
    popup = null;

    /** @type {string} CSS selector for trigger elements */
    static selector = '[data-json-editor]';

    /** @type {Object} Customizable strings and icons */
    static strings = {
        popupTitle: 'Edit JSON',
        popupOkButtonLabel: 'Done',
        popupCancelButtonLabel: 'Cancel',
        targetElementNotFound: 'Target element not found.',
        moveUpTitle: 'Move up',
        moveUpIcon: '<i class="fas fa-arrow-circle-up"></i>',
        moveDownTitle: 'Move down',
        moveDownIcon: '<i class="fas fa-arrow-circle-down"></i>',
        removeTitle: 'Remove this item',
        removeIcon: '<i class="fas fa-times-circle"></i>',
        collapseItemTitle: 'Collapse item',
        collapseItemIcon: '<i class="fas fa-chevron-circle-down"></i>',
        expandItemTitle: 'Expand item',
        expandItemIcon: '<i class="fas fa-chevron-circle-up"></i>',
        noKeyError: 'The key is required.',
        selectType: 'Select type',
        add: 'Add',
        newKey: 'New key',
        confirmRemoval: 'Remove this item?',
        elementNotFound: 'Target element not found',
        invalidJson: 'Invalid JSON',
        jsonNotSet: 'JSON is not set',
        unnamed: 'Unnamed'
    };

    /** @type {Boolean} Can user move object / array items? */
    static canMoveItems = true;
    /** @type {Boolean} Can user remove object / array items? */
    static canRemoveItems = true;

    /**
     * Creates a JSON editor instance
     * @constructor
     * @param {HTMLElement|null} jsonElement - JSON input/output element
     */
    constructor(jsonElement = null) {
        if (jsonElement) {
            this.set(jsonElement);
        }
        if (!window.ejRemoveEventSet) {
            window.ejRemoveEventSet = true;
            rootEvent('a.remove-item', 'click', async event => {
                event.preventDefault();
                await this.removeItem(event.target);
            });
            rootEvent('a.up-item', 'click', async event => {
                event.preventDefault();
                this.upItem(event.target);
            });
            rootEvent('a.down-item', 'click', async event => {
                event.preventDefault();
                this.downItem(event.target);
            });
        }
    }

    /**
     * Updates the strings configuration
     * @static
     * @param {Object} obj - New strings configuration
     */
    static setStrings(obj) {
        this.strings = { ...this.strings, ...obj };
    }

    /**
     * Applies editor to all elements matching the selector
     * @static
     */
    static apply() {
        $apply(this.selector, el => {
            const targetSelector = el.dataset.targetSelector;
            const jsonEl = targetSelector ? document.querySelector(targetSelector) : el;

            if (!jsonEl) {
                console.warn(this.strings.elementNotFound);
                return;
            }

            if (!targetSelector) {
                el.setAttribute('readonly', true);
            }

            el.addEventListener('click', () => {
                const editor = new EditJSON(jsonEl);
                editor.openEditor();
            });
        });
    }

    /**
     * Sets the JSON element to be edited
     * @param {HTMLElement} jsonElement - Element containing JSON
     * @returns {boolean} True if JSON was parsed successfully
     */
    set(jsonElement) {
        this.jsonElement = jsonElement;
        this.id = jsonElement.id || jsonElement.name || EditJSON.strings.unnamed;
        this.jsonText = jsonElement.value.trim();

        try {
            this.jsonData = JSON.parse(this.jsonText);
            this.makeHtml();
            return true;
        } catch (e) {
            this.jsonData = null;
            this.jsonElement = null;
            this.jsonText = '';
            this.id = '';
            console.error(EditJSON.strings.invalidJson, e);
            return false;
        }
    }

    /**
     * Creates the HTML editor element
     */
    makeHtml() {
        const existent = document.getElementById(`__ej_${this.id}`);
        if (existent) {
            this.htmlElement = existent;
        } else {
            const cls = 'edit-json' 
                + (EditJSON.canMoveItems ? '' : ' no-move') 
                + (EditJSON.canRemoveItems ? '' : ' no-remove');
            this.htmlElement = tag('div', {
                id: `__ej_${this.id}`,
                class: cls,
                style: 'display: none;'
            });
            document.body.appendChild(this.htmlElement);
        }
    }

    /**
     * Starts JSON editing
     * @returns {boolean} False if no data to edit
     */
    edit() {
        if (!this.jsonData) {
            console.error(EditJSON.strings.jsonNotSet);
            return false;
        }

        let elem;
        if (this.getType(this.jsonData) === 'array') {
            elem = this.editArray(this.jsonData);
        } else {
            elem = this.editObject(this.jsonData);
        }

        this.htmlElement.appendChild(elem);
    }

    /**
     * Opens the editor in a popup
     */
    openEditor() {
        if (this.htmlElement.innerHTML.trim() === '') {
            this.edit();
        }
        this.popup = new Popup(EditJSON.strings.popupTitle, this.htmlElement);
        this.htmlElement.style.display = 'block';
        const cancelButton = tag('button', { type: 'button', class: 'close-popup secondary' }, EditJSON.strings.popupCancelButtonLabel);
        const okButton = tag('button', { type: 'button', class: 'save-json' }, EditJSON.strings.popupOkButtonLabel);
        cancelButton.addEventListener('click', () => this.popup.close());
        okButton.addEventListener('click', () => {
            const json = this.extractFromHtml();
            this.jsonElement.value = JSON.stringify(json, null, 4);
            this.popup.close();
        });
        this.popup.addFooterButton(cancelButton);
        this.popup.addFooterButton(okButton);
        this.popup.open();
    }

    /**
     * Creates an editable field for key-value pair
     * @param {string} key - Property name
     * @param {*} val - Property value
     * @returns {HTMLElement} DIV element containing the editable field
     */
    editField(key, val) {
        const keyText = tag('span', { contenteditable: true, spellcheck: false, class: 'edit-key' }, key);
        const cb = () => {
            if (!this.isValidKey(keyText.innerText.trim()) || this.isDuplicatedKey(keyText)) {
                keyText.classList.add('invalid');
            } else {
                keyText.classList.remove('invalid');
            }
        };
        keyText.addEventListener('input', cb);
        keyText.addEventListener('input', cb);
        let valText;
        switch (this.getType(val)) {
            case 'array':
                valText = this.editArray(val);
                break;
            case 'object':
                valText = this.editObject(val);
                break;
            default:
                valText = this.valHtml(val);
        }
        return tag('div', {class: 'edit-line'}, [ keyText, ": ", valText ]);
    }

    /**
     * Returs all keys of the given object, as an array of strings
     * @param {HTMLElement} elem - Element inside the object (or the object itself)
     * @returns {string[]} Array with all object keys
     */
    objectKeys(elem) {
        const obj = elem.closest('.edit-object');
        const keyEls = obj.querySelectorAll(':scope > .edit-line > .edit-key');
        return Array.from(keyEls).map(e => e.innerText.trim());
    }

    /**
     * Creates appropriate HTML for value based on its type
     * @param {*} val - Value to render
     * @param {boolean} [actions=true] - Whether to include action buttons
     * @returns {HTMLElement} Element containing the edit control
     */
    valHtml(val, actions = true) {
        let valText;
        switch (this.getType(val)) {
            case 'boolean':
                const yes = { value: 'true' };
                if (true === val) yes.selected = true;
                const no = { value: 'false' };
                if (false === val) no.selected = true;
                valText = tag('select', { class: 'edit-value' }, [
                    tag('option', yes, 'true'),
                    tag('option', no, 'false')
                ]);
                break;
            case 'null':
                valText = tag('span', {}, 'null');
                break;
            case 'array':
                valText = this.editArray(val);
                break;
            case 'object':
                valText = this.editObject(val);
                break;
            case 'number':
                valText = tag('input', { type: 'number', value: val, class: 'edit-value-number-input' });
                break;
            default:
                const dateType = this.isDateTime(val);
                if (dateType) {
                    valText = this.bidirectionalInput(dateType, val);
                } else if(this.isColor(val)) {
                    valText = this.bidirectionalInput('color', val);
                } else {
                    valText = tag('span', { contenteditable: true, class: 'edit-value' }, val);
                }
        }
        if (actions) {
            return tag('span', { class: 'input-wrapper' }, [valText, this.makeActions()]);
        }
        return tag('span', { class: 'input-wrapper' }, valText);
    }

    bidirectionalInput(type, value) {
        const txt = tag('span', { contenteditable: true, class: 'edit-value' }, value);
        const inp = tag('input', { type, value, class: `edit-value-${type}-input` });
        txt.addEventListener('focus', () => line.classList.add('focused'));
        txt.addEventListener('blur', () => line.classList.remove('focused'));
        txt.addEventListener('input', () => inp.value = txt.innerText.trim());
        inp.addEventListener('focus', () => line.classList.add('focused'));
        inp.addEventListener('blur', () => line.classList.remove('focused'));
        inp.addEventListener('input', () => txt.innerText = inp.value.trim());
        return tag('span', { class: `edit-value-${type}` }, [ txt, inp ]);
    }

    /**
     * Creates action buttons (remove, move up/down)
     * @returns {HTMLElement} Action buttons container
     */
    makeActions() {
        const removeButton = tag(
            'a', 
            { href: '#', title: EditJSON.strings.removeTitle, class: 'remove-item skip' }, 
            EditJSON.strings.removeIcon
        );
        const upButton = tag(
            'a', 
            { href: '#', class: 'up-item skip', title: EditJSON.strings.moveUpTitle }, 
            EditJSON.strings.moveUpIcon
        );
        const downButton = tag(
            'a', 
            { href: '#', class: 'down-item skip', title: EditJSON.strings.moveDownTitle }, 
            EditJSON.strings.moveDownIcon
        );
        return tag('div', { class: 'actions skip' }, [removeButton, upButton, downButton]);
    }

    /**
     * Creates interface for array editing
     * @param {Array} arr - Array to edit
     * @returns {HTMLElement} SPAN element containing array items
     */
    editArray(arr) {
        const items = [];
        arr.forEach(item => {
            items.push(this.valHtml(item));
        });
        items.push(this.newArrayItem());
        items.push(this.makeActions());
        const editor = tag('span', { class: 'edit-array' }, items);
        return tag('span', { class: 'edit-array-wrapper' }, [ ...this.toggleLinks(), editor ]);
    }

    /**
     * Creates interface for adding new array item
     * @returns {HTMLElement} DIV with add controls
     */
    newArrayItem() {
        const valField = tag('select', { class: 'value' }, [
            tag('option', { value: '', selected: true, disabled: true }, EditJSON.strings.selectType),
            tag('option', { value: 'string' }, 'string'),
            tag('option', { value: 'number' }, 'number'),
            tag('option', { value: 'boolean' }, 'boolean'),
            tag('option', { value: 'array' }, 'array'),
            tag('option', { value: 'object' }, 'object')
        ]);
        valField.addEventListener('input', event => {
            this.enableAddButton(event.target);
        });
        const addButton = tag('button', { type: 'button', disabled: true }, EditJSON.strings.add);
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item skip' }, [ valField, addButton ]);
    }

    /**
     * Creates interface for object editing
     * @param {Object} obj - Object to edit
     * @returns {HTMLElement} SPAN element containing object fields
     */
    editObject(obj) {
        const lines = [];
        for (const key in obj) {
            lines.push(this.editField(key, obj[key]));
        }
        lines.push(this.newObjectItem());
        lines.push(this.makeActions());
        const editor = tag('span', { class: 'edit-object' }, lines);
        return tag('span', { class: 'edit-object-wrapper' }, [ ...this.toggleLinks(), editor ]);
    }

    /**
     * Creates interface for adding new object property
     * @returns {HTMLElement} DIV with add controls
     */
    newObjectItem() {
        const keyField = tag('input', { type: 'text', class: 'key', placeholder: EditJSON.strings.newKey });
        keyField.addEventListener('input', event => this.enableAddButton(event.target));
        const keyEl = tag('span', {}, ['"', keyField, '": ']);
        const valField = tag('select', { class: 'value' }, [
            tag('option', { value: '', selected: true, disabled: true }, EditJSON.strings.selectType),
            tag('option', { value: 'string' }, 'string'),
            tag('option', { value: 'number' }, 'number'),
            tag('option', { value: 'boolean' }, 'boolean'),
            tag('option', { value: 'array' }, 'array'),
            tag('option', { value: 'object' }, 'object')
        ]);
        valField.addEventListener('input', event => this.enableAddButton(event.target));
        const addButton = tag('button', { type: 'button', disabled: true }, EditJSON.strings.add);
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item skip' }, [ keyEl, valField, addButton ]);
    }

    /**
     * Creates toggle links (collapse/expand)
     * @returns {HTMLElement[]} Array of toggle elements
     */
    toggleLinks() {
        const toggleUp = tag(
            'a', 
            { class: 'toggle up skip', title: EditJSON.strings.collapseItemTitle, href: '#' }, 
            EditJSON.strings.collapseItemIcon
        );
        const toggleDown = tag(
            'a', 
            { class: 'toggle down skip', title: EditJSON.strings.expandItemTitle, href: '#' }, 
            EditJSON.strings.expandItemIcon
        );
        toggleUp.addEventListener('click', event => {
            event.preventDefault();
            this.toggleUp(event.target);
        });
        toggleDown.addEventListener('click', event => {
            event.preventDefault();
            this.toggleDown(event.target);
        });
        return [toggleUp, toggleDown];
    }

    /**
     * Collapses an item
     * @param {HTMLElement} elem - Toggle element that triggered the action
     */
    toggleUp(elem) {
        const wrapper = elem.closest('.edit-object-wrapper,.edit-array-wrapper');
        wrapper.classList.add('collapsed');
    }

    /**
     * Expands an item
     * @param {HTMLElement} elem - Toggle element that triggered the action
     */
    toggleDown(elem) {
        const wrapper = elem.closest('.edit-object-wrapper,.edit-array-wrapper');
        wrapper.classList.remove('collapsed');
    }

    /**
     * Moves an item up or down
     * @param {HTMLElement} elem - Element to move
     * @param {string} direction - 'up' or 'down'
     */
    moveItem(elem, direction) {
        const line = elem.closest('.edit-array .input-wrapper, .edit-object .edit-line');
        if (!line) return;

        const isArray = line.classList.contains('input-wrapper');
        const container = isArray ? line.closest('.edit-array') : line.closest('.edit-object');
        if (!container) return;

        const selector = isArray ? '.input-wrapper' : '.edit-line';
        const allItems = Array.from(container.children).filter(c => c.matches(selector));
        const currentIndex = allItems.indexOf(line);

        if (direction === 'up' && currentIndex > 0) {
            container.insertBefore(line, allItems[currentIndex - 1]);
        } else if (direction === 'down' && currentIndex < allItems.length - 1) {
            container.insertBefore(allItems[currentIndex + 1], line);
        }
    }

    /**
     * Moves item up
     * @param {HTMLElement} elem - Element to move
     */
    upItem(elem) {
        this.moveItem(elem, 'up');
    }

    /**
     * Moves item down
     * @param {HTMLElement} elem - Element to move
     */
    downItem(elem) {
        this.moveItem(elem, 'down');
    }

    isDuplicatedKey(key) {
        const wrapper = key.closest('.edit-object');
        const keys = wrapper.querySelectorAll('.edit-key');
        const filtered = Array.from(keys).filter(e => e.innerText.trim() === key.innerText.trim());
        return filtered.length > 1;
    }

    /**
     * Valida chaves de objetos JSON
     * @param {string} key - Chave a ser validada
     * @returns {boolean}
     */
    isValidKey(key) {
        return typeof key === 'string' && 
            key.length > 0 &&
            !/[\u0000-\u001F"\\]/.test(key) &&
            !['__proto__', 'constructor'].includes(key);
    }

    /**
     * Enables/disables add button based on input validity
     * @param {HTMLElement} elem - Element that triggered the event
     */
    enableAddButton(elem) {
        const div = elem.closest('div');
        const button = div.querySelector('button');
        let disabled = div.querySelector('select').value == '';
        const input = div.querySelector('input');
        if (input && !input.value) {
            disabled = true;
        }
        button.disabled = disabled;
    }

    /**
     * Adds new item to array/object
     * @param {HTMLElement} elem - Button that triggered the action
     */
    addItem(elem) {
        const iniVals = {
            string: '',
            number: 0,
            boolean: true,
            array: [],
            object: {}
        };
        const div = elem.closest('div.add-obj-item');
        const select = div.querySelector('select');
        const type = select.value;
        const input = div.querySelector('input');
        let item;
        if (input) {
            if (input.value) {
                item = this.editField(input.value, iniVals[type]);
                const keys = this.objectKeys(div);
                if (keys.includes(input.value)) {
                    item.querySelector('.edit-key').classList.add('invalid');
                }
            } else {
                console.error(EditJSON.strings.noKeyError);
                return;
            }
            input.value = '';
        } else {
            item = this.valHtml(iniVals[type], ! /object|array/.test(type));
        }
        div.parentElement.insertBefore(item, div);
        select.value = '';
        this.enableAddButton(select);
    }

    /**
     * Removes item from array/object with confirmation
     * @param {HTMLElement} elem - Element to remove
     * @returns {Promise<void>}
     */
    async removeItem(elem) {
        const confirmed = await new Promise(resolve =>
            setTimeout(() => resolve(confirm(EditJSON.strings.confirmRemoval)), 0)
        );
        if (confirmed) {
            elem.closest('.edit-object > .edit-line, .edit-array > .input-wrapper')?.remove();
        }
    }

    /**
     * Extracts JSON data from HTML editor
     * @returns {Object|Array} Parsed JSON structure
     */
    extractFromHtml() {
        const root = $single('.popup-popup .edit-json > :first-child');
        function parseNode(node) {
            if (node.classList.contains('edit-object-wrapper')) {
                const elem = node.querySelector('.edit-object');
                if (!elem) return null;
                const obj = {};
                const lines = elem.querySelectorAll(':scope > .edit-line');
                for (const line of lines) {
                    const keyEl = line.querySelector('.edit-key');
                    const key = keyEl?.innerText.trim();
                    const valContainer = [...line.children].find(el => el !== keyEl && !el.matches('.skip'));
                    if (!key || !valContainer) continue;

                    const value = extractValue(valContainer);
                    if (value !== null) {
                        obj[key] = value;
                    }
                }
                return obj;
            }
            if (node.classList.contains('edit-array-wrapper')) {
                const elem = node.querySelector('.edit-array');
                if (!elem) return null;
                const arr = [];
                const items = elem.querySelectorAll(':scope > .input-wrapper');
                for (const item of items) {
                    const value = extractValue(item);
                    if (value !== null) {
                        arr.push(value);
                    }
                }
                return arr;
            }
            return null;
        }

        function extractValue(container) {
            if (container.classList.contains('edit-object-wrapper') ||
                container.classList.contains('edit-array-wrapper')) {
                return parseNode(container);
            }
            if (container.classList.contains('input-wrapper')) {
                const nestedObj = container.querySelector('.edit-object-wrapper, .edit-array-wrapper');
                if (nestedObj) {
                    return parseNode(nestedObj);
                }
                const input = container.querySelector('input');
                if (input) {
                    if (input.type === 'number') return Number(input.value);
                    if (input.type === 'date' || input.type === 'datetime-local' || input.type === 'time') {
                        return input.value;
                    }
                }
                const select = container.querySelector('select');
                if (select) {
                    const val = select.value;
                    return val === 'true' ? true : val === 'false' ? false : val;
                }
                const span = container.querySelector('span.edit-value');
                if (span) return span.innerText.trim();
            }
            return null;
        }
        return parseNode(root);
    }

    /**
     * Determines variable type (improved for objects/arrays)
     * @param {*} variable - Value to check
     * @returns {string} Value type ('object', 'array', 'null', etc.)
     */
    getType(variable) {
        if (variable === null) {
            return 'null';
        }
        if (Array.isArray(variable)) {
            return 'array';
        }
        if (isPlainObject(variable)) {
            return 'object';
        }
        return typeof variable;
    }

    /**
     * Checks if string represents a hex color
     * @param {string} val - Value to test
     * @returns {boolean} TRUE is is a color
     */
    isColor(val) {
        return /^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(val.trim())
    }

    /**
     * Checks if string represents a date/time
     * @param {string} val - Value to test
     * @returns {string|false} Date type ('date', 'datetime-local', 'time') or false
     */
    isDateTime(val) {
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
}

export default EditJSON;