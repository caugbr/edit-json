import { rootEvent, tag, $single, debounce, rgbToHex } from "./util.js";
import Popup from './popup.js';
import Strings from "./strings.js";

class EditorUI {
    /** @type {string} Unique editor identifier */
    id = '';

    /** @type {string} Title for editor popup */
    popupTitle = '';

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

    /** @type {Object} Instance of JsonSchema */
    jSchema = null;

    /** @type {Object} Local configuration values */
    config = null;

    /** @type {Object} EditJSON class (only static methods) */
    ej = null;

    constructor(jsonElement = null, jSchema = null, config = null, staticEJ = null) {
        this.ej = staticEJ;
        if (jSchema) {
            this.setSchema(jSchema);
        }
        if (config) {
            this.setConfig(config);
        }
        if (jsonElement) {
            this.set(jsonElement);
        }
        
        if (!window.ejEventsAreSet) {
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
            window.ejEventsAreSet = true;
        }
    }

    /**
     * Set JSON Schema
     * @param {Object} schema - Schema
     */
    setSchema(jSchema) {
        this.jSchema = jSchema;
    }

    /**
     * Set config
     * @param {Object} config - Config object
     */
    setConfig(config) {
        this.config = config;
    }
    
    /**
     * Sets the JSON element to be edited
     * @param {HTMLElement} jsonElement - Element containing JSON
     * @returns {boolean} True if JSON was parsed successfully
     */
    set(jsonElement) {
        this.jsonElement = jsonElement;
        this.id = jsonElement.id || jsonElement.name || Strings.get('unnamed');
        this.jsonText = jsonElement.value.trim();
        if (this.jsonElement.dataset.title ?? false) {
            this.popupTitle = this.jsonElement.dataset.title;
        }
        
        try {
            this.jsonData = JSON.parse(this.jsonText);
            this.makeHtml();
            return true;
        } catch (error) {
            this.reset();
            console.error(Strings.get('invalidJson', 'error', { error }));
            return false;
        }
    }

    /**
     * Reset data
     */
    reset() {
        this.jsonData = null;
        this.jsonElement = null;
        this.jsonText = '';
        this.id = '';
    }

    /**
     * Creates the HTML editor element
     */
    makeHtml() {
        const existent = $single(`#__ej_${this.id}`);
        if (existent) {
            this.htmlElement = existent;
        } else {
            const cls = 'edit-json' 
                + ((this.jSchema.schema ?? false) ? ' has-schema' : '') 
                + (this.config.insertItems ? '' : ' no-insert') 
                + (this.config.moveItems ? '' : ' no-move') 
                + (this.config.removeItems ? '' : ' no-remove');
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
        if (!this.jsonElement) {
            console.error(Strings.get('jsonNotSet', 'error'));
            return false;
        }

        let elem;
        if (this.ej.getType(this.jsonData) === 'array') {
            elem = this.editArray(this.jsonData);
        } else {
            elem = this.editObject(this.jsonData);
        }

        this.htmlElement.appendChild(tag('div', { class: 'errors' }));
        this.htmlElement.appendChild(elem);
        this.showSchemaLink();
    }

    showSchemaLink() {
        if (this.jSchema.schema) {
            const showSchema = tag(
                'a', 
                { class: 'show-schema disabled', title: Strings.get('hasSchema') }, 
                Strings.get('lockIcon', 'icon')
            );
            if (this.config.visibleSchema) {
                showSchema.title = Strings.get('viewSchema');
                showSchema.classList.remove('disabled');
                showSchema.addEventListener('click', () => {
                    const close = tag('a', { class: 'close-schema-overlay' }, Strings.get('closeIcon', 'icon'));
                    close.addEventListener('click', () => overlay.remove());
                    const wrap = tag('pre', { class: 'wrap-schema' }, JSON.stringify(this.jSchema.schema, null, 4));
                    const wrapper = tag('div', {}, [tag('h3', {}, Strings.get('viewSchemaTitle')), wrap]);
                    const overlay = tag('div', { class: 'schema-overlay' }, [close, wrapper]);
                    this.htmlElement.appendChild(overlay);
                });
            }
            this.htmlElement.appendChild(showSchema);
        }
    }

    /**
     * Opens the editor in a popup
     */
    openEditor() {
        if (this.htmlElement.innerHTML.trim() === '') {
            this.edit();
        }
        const title = this.popupTitle || Strings.get('popupTitle');
        this.popup = new Popup(title, this.htmlElement);
        this.popup.iconClose = Strings.get('popupClose', 'icon');
        this.popup.iconMaximize = Strings.get('popupMaximize', 'icon');
        this.popup.iconRestore = Strings.get('popupRestore', 'icon');
        this.htmlElement.style.display = 'block';
        const cancelButton = tag('button', { type: 'button', class: 'close-popup secondary' }, Strings.get('popupCancelButtonLabel'));
        const okButton = tag('button', { type: 'button', class: 'save-json' }, Strings.get('popupOkButtonLabel'));
        cancelButton.addEventListener('click', () => this.popup.close());
        okButton.addEventListener('click', async () => {
            const json = this.extractFromHtml();
            if (null !== this.jSchema.schema) {
                const errors = this.jSchema.validateJson(json);
                if (errors.length) this.displayErrors(errors);
            }
            this.jsonElement.value = JSON.stringify(json, null, 4);
            this.popup.close();
        });
        this.popup.addFooterButton(cancelButton);
        this.popup.addFooterButton(okButton);
        this.popup.on('open', () => {
            if (null !== this.jSchema.schema) {
                setTimeout(() => this.verifyErrors(), 500);
            }
        });
        this.popup.open();
        setTimeout(() => this.jSchema.applyRequiredClass(), 120);
    }

    verifyErrors() {
        this.displayErrors();
        if (null !== this.jSchema.schema) {
            const json = this.extractFromHtml();
            const errors = this.jSchema.validateJson(json);
            if (errors.length) {
                this.displayErrors(errors);
            }
        }
    }

    displayErrors(errors = []) {
        const elem = $single('.edit-json > .errors');
        elem.innerHTML = '';
        errors.forEach(err => {
            const parts = err.split(': ');
            const item = `<span class="path">${parts[0]}</span> <span class="msg">${parts[1]}</span>`;
            const line = tag('div', { class:'error-line' }, item);
            elem.appendChild(line);
        });
    }
    
    /**
     * Generates a <select> for a key with an enum in the schema, based on currentPath.
     * @returns {string|false} - HTML for <select> if enum exists, false otherwise.
     */
    enumField(value, path = null) {
        if (!this.jSchema.schema) {
            return false;
        }
        const schema = this.jSchema.getSchemaForPath(path ?? this.jSchema.getCurrentPath()) || {};
        const values = schema.enum ?? null;
        if (values) {
            const options = [];
            values.forEach(val => {
                const attrs = { value: val }
                if (value === val) {
                    attrs.selected = true;
                }
                options.push(tag('option', attrs, typeof val == 'string' ? `"${val}"` : val));
            });
            const attrs = { id: `enum_${this.jSchema.currentPath.join('_')}`, class: 'edit-value' };
            if (schema.ejCanEditKeys === false) {
                attrs.disabled = true;
            }
            return tag('select', attrs, options);
        }
        return false;
    }

    /**
     * Creates an editable field for key-value pair
     * @param {string} key - Property name
     * @param {*} val - Property value
     * @returns {HTMLElement} DIV element containing the editable field
     */
    editField(key, val) {
        this.jSchema.pushPath(key);
        const schema = this.jSchema.getSchemaForPath(this.jSchema.getCurrentPath()) || null;
        const contenteditable = schema ? false : this.config.editKeys;
        const keyText = tag('span', { contenteditable, spellcheck: false, class: 'edit-key' }, key);
        const cb = () => {
            if (!this.ej.isValidKey(keyText.innerText.trim()) || this.ej.isDuplicatedKey(keyText)) {
                keyText.classList.add('invalid');
            } else {
                keyText.classList.remove('invalid');
            }
        };
        keyText.addEventListener('input', cb);
        keyText.addEventListener('input', cb);
        let valText;
        switch (this.ej.getType(val)) {
            case 'array':
                valText = this.editArray(val);
                break;
            case 'object':
                valText = this.editObject(val);
                break;
            default:
                valText = this.valHtml(val, true, this.jSchema.getCurrentPath());
        }
        const attrs = { class: 'edit-line', 'data-path': this.jSchema.getCurrentPath() };
        this.jSchema.popPath();
        let desc = '';
        if (schema && schema.description) {
            desc = tag('span', { class: 'description' }, schema.description);
        }
        return tag('div', attrs, [ keyText, ": ", valText, desc ]);
    }

    /**
     * Returs all keys of the elem parent object, as an array of strings
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
    valHtml(val, actions = true, path = '') {
        let valText;
        switch (this.ej.getType(val)) {
            case 'boolean':
                const yes = { value: 'true' };
                if (true === val) yes.selected = true;
                const no = { value: 'false' };
                if (false === val) no.selected = true;
                valText = tag(
                    'select', 
                    { class: 'edit-value'},
                    [ tag('option', yes, 'true'), tag('option', no, 'false') ]
                );
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
                valText = tag('input', { 
                    type: 'number', 
                    value: val, 
                    class: 'edit-value-number-input'
                });
                break;
            default:
                let schemaFormat = '';
                if (path) {
                    const schema = this.jSchema.getSchemaForPath(path) || null;
                    if (schema && schema.format && /color|date|time/.test(schema.format)) {
                        schemaFormat = schema.format == 'date-time' ? 'datetime-local' : schema.format;
                    }
                }
                const dateType = this.ej.isDateTime(val);
                if (schemaFormat) {
                    valText = this.bidirectTextInput(schemaFormat, val);
                } else if (dateType) {
                    valText = this.bidirectTextInput(dateType, val);
                } else if (this.ej.isColor(val)) {
                    valText = this.bidirectTextInput('color', val);
                } else {
                    valText = this.enumField(val) || tag('span', { contenteditable: true, class: 'edit-value' }, val);
                }
        }
        const attrs = { class: 'input-wrapper' };
        if (path) {
            attrs['data-path'] = path;
        }
        this.applyOnInput(valText);
        if (actions) {
            return tag('span', attrs, [valText, this.makeActions()]);
        }
        return tag('span', attrs, valText);
    }

    applyOnInput(elem) {
        this.debouncedOnInput = debounce(this.onInput.bind(this), 500);
        if (elem.matches('.edit-value-date,.edit-value-color')) {
            const span = $single('span[contenteditable="true"]', elem);
            const input = $single('input', elem);
            span.addEventListener('input', (event) => this.debouncedOnInput(event.target));
            input.addEventListener('input', (event) => this.debouncedOnInput(event.target));
        }
        if (elem.matches('select.edit-value[id^="enum_"],select.edit-value,span.edit-value[contenteditable="true"],input')) {
            elem.addEventListener('input', (event) => this.debouncedOnInput(event.target));
        } else if (elem.matches('span.edit-value')) {
            const span = $single('span[contenteditable="true"]', elem);
            span.addEventListener('input', (event) => this.debouncedOnInput(event.target));
        }
    }

    onInput() {
        this.verifyErrors();
    }

    /**
     * Creates a bidirectional input control (editable span + input)
     * @param {string} type - Input type (here is only 'date' or 'color')
     * @param {string} value - Initial value
     * @returns {HTMLElement} Container element
     */
    bidirectTextInput(type, value) {
        if (!value && type == 'color') {
            value = '#000000';
        }
        if (!value && type == 'date') {
            value = (new Date()).toISOString().split('T')[0];
        }
        if (!value && type == 'datetime-local') {
            const now = new Date().getTime() - new Date().getTimezoneOffset() * 60000;
            value = (new Date(now)).toISOString().slice(0, 16);
        }
        if (!value && type == 'time') {
            value = (new Date()).toTimeString().substring(0, 5);
        }
        const txt = tag('span', { contenteditable: true, class: 'edit-value' }, value);
        const inp = tag('input', { type, value, class: `edit-value-${type}-input`, novalidate: '' });
        const line = tag('span', { class: `edit-value-${type}` }, [ txt, inp ]);
        txt.addEventListener('focus', () => line.classList.add('focused'));
        txt.addEventListener('blur', () => line.classList.remove('focused'));
        txt.addEventListener('input', () => inp.value = rgbToHex(txt.innerText.trim()));
        inp.addEventListener('focus', () => line.classList.add('focused'));
        inp.addEventListener('blur', () => line.classList.remove('focused'));
        inp.addEventListener('input', () => txt.innerText = inp.value.trim());
        return line;
    }

    /**
     * Creates action buttons (remove, move up/down)
     * @returns {HTMLElement} Action buttons container
     */
    makeActions(cfg = null) {
        const elems = [];
        if (cfg?.canRemove ?? this.config.removeItems) {
            const removeButton = tag('a', { 
                href: '#', 
                title: Strings.get('removeTitle'), 
                'data-skip': true,
                class: 'remove-item' 
            }, Strings.get('removeIcon', 'icon'));
            elems.push(removeButton);
        }
        if (cfg?.canMove ?? this.config.moveItems) {
            const upButton = tag('a', { 
                href: '#', 
                class: 'up-item', 
                'data-skip': true,
                title: Strings.get('moveUpTitle') 
            }, Strings.get('moveUpIcon', 'icon'));
            const downButton = tag('a', { 
                href: '#', 
                class: 'down-item', 
                'data-skip': true,
                title: Strings.get('moveDownTitle') 
            }, Strings.get('moveDownIcon', 'icon'));
            elems.push(upButton, downButton);
        }
        return tag('div', { class: 'actions', 'data-skip': true }, elems);
    }

    /**
     * Creates interface for array editing
     * @param {Array} arr - Array to edit
     * @returns {HTMLElement} SPAN element containing array items
     */
    editArray(arr) {
        const schema = this.jSchema.getSchemaForPath(this.jSchema.getCurrentPath()) || null;
        const canInsert = schema ? schema.ejCanInsertItems ?? this.config.insertItems : this.config.insertItems;
        const canMove = schema ? schema.ejCanMoveItems ?? this.config.moveItems : this.config.moveItems;
        const canRemove = schema ? schema.ejCanRemoveItems ?? this.config.removeItems : this.config.removeItems;
        const items = [];
        arr.forEach((item, index) => {
            this.jSchema.pushPath(index);
            items.push(this.valHtml(item, true, this.jSchema.getCurrentPath()));
            this.jSchema.popPath();
        });
        if (canInsert) {
            if (schema) {
                if (!schema.maxItems || arr.length < schema.maxItems) {
                    items.push(this.newArrayItem());
                }
            } else {
                items.push(this.newArrayItem());
            }
        }
        items.push(this.makeActions({canMove, canRemove}));
        const cls = ['edit-array'];
        if (canMove === false) {
            cls.push('no-move-items');
        }
        if (canRemove === false) {
            cls.push('no-remove-items');
        }
        const editor = tag('span', { class: cls.join(' '), 'data-path': this.jSchema.getCurrentPath() }, items);
        return tag('span', { class: 'edit-array-wrapper' }, [...this.toggleLinks(), editor]);
    }

    /**
     * Creates interface for adding new array item
     * @returns {HTMLElement} DIV with add controls
     */
    newArrayItem() {
        const valField = tag('select', { class: 'value' }, [
            tag('option', { value: '', selected: true, disabled: true }, Strings.get('selectType')),
            tag('option', { value: 'string' }, 'string'),
            tag('option', { value: 'number' }, 'number'),
            tag('option', { value: 'boolean' }, 'boolean'),
            tag('option', { value: 'array' }, 'array'),
            tag('option', { value: 'object' }, 'object')
        ]);
        valField.addEventListener('input', event => {
            this.enableAddButton(event.target);
        });
        const addButton = tag('button', { type: 'button', disabled: true }, Strings.get('add'));
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item', 'data-skip': true }, [ valField, addButton ]);
    }

    /**
     * Creates interface for object editing
     * @param {Object} obj - Object to edit
     * @returns {HTMLElement} SPAN element containing object fields
     */
    editObject(obj) {
        const schema = this.jSchema.getSchemaForPath(this.jSchema.getCurrentPath()) || {};
        const canInsert = schema ? schema.ejCanInsertItems ?? this.config.insertItems : this.config.insertItems;
        const canMove = schema ? schema.ejCanMoveItems ?? this.config.moveItems : this.config.moveItems;
        const canRemove = schema ? schema.ejCanRemoveItems ?? this.config.removeItems : this.config.removeItems;
        const lines = [];
        for (const key in obj) {
            lines.push(this.editField(key, obj[key]));
        }
        if (canInsert) {
            if (schema) {
                if (schema.additionalProperties !== false) {
                    lines.push(this.newObjectItem(schema.additionalProperties?.type ?? null));
                }
            } else {
                lines.push(this.newObjectItem());
            }
        }
        lines.push(this.makeActions({canMove, canRemove}));
        const cls = ['edit-object'];
        if (canMove === false) {
            cls.push('no-move-items');
        }
        if (canRemove === false) {
            cls.push('no-remove-items');
        }
        const editor = tag('span', { class: cls.join(' '), 'data-path': this.jSchema.getCurrentPath() }, lines);
        return tag('span', { class: 'edit-object-wrapper' }, [...this.toggleLinks(), editor]);
    }

    /**
     * Creates interface for adding new object property
     * @returns {HTMLElement} DIV with add controls
     */
    newObjectItem(types = null) {
        types = types ?? ['string', 'number', 'boolean', 'array', 'object'];
        if (!Array.isArray(types)) {
            types = [types];
        }
        const keyField = tag('input', { type: 'text', class: 'key', placeholder: Strings.get('newKey') });
        keyField.addEventListener('input', event => this.enableAddButton(event.target));
        const keyEl = tag('span', {}, ['"', keyField, '": ']);

        const options = [tag('option', { value: '', selected: true, disabled: true }, Strings.get('selectType'))];
        types.forEach(tp => options.push(tag('option', { value: tp }, tp)));
        const valField = tag('select', { class: 'value' }, options);
        valField.addEventListener('input', event => this.enableAddButton(event.target));
        
        const addButton = tag('button', { type: 'button', disabled: true }, Strings.get('add'));
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item', 'data-skip': true }, [ keyEl, valField, addButton ]);
    }

    /**
     * Creates toggle links (collapse/expand)
     * @returns {HTMLElement[]} Array of toggle elements
     */
    toggleLinks() {
        const toggleUp = tag('a', { 
            class: 'toggle up', 
            'data-skip': true,
            title: Strings.get('collapseItemTitle'), 
            href: '#' 
        }, Strings.get('collapseItemIcon', 'icon'));
        const toggleDown = tag('a', { 
            class: 'toggle down', 
            'data-skip': true,
            title: Strings.get('expandItemTitle'), 
            href: '#' 
        }, Strings.get('expandItemIcon', 'icon'));
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
    
    /**
     * Enables/disables add button based on input validity
     * @param {HTMLElement} elem - Element that triggered the event
     */
    enableAddButton(elem) {
        const div = elem.closest('div');
        const button = div.querySelector('button');
        let disabled = div.querySelector('select').value == '';
        const input = div.querySelector('input');
        if (input && (!input.value || !this.ej.isValidKey(input.value))) {
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
            boolean: false,
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
                console.error(Strings.get('noKeyError', 'error'));
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
            setTimeout(() => resolve(confirm(Strings.get('confirmRemoval'))), 0)
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
        const root = $single('.popup-popup .edit-json > :nth-child(2)');
        function parseNode(node) {
            if (node.classList.contains('edit-object-wrapper')) {
                const elem = node.querySelector('.edit-object');
                if (!elem) return null;
                const obj = {};
                const lines = elem.querySelectorAll(':scope > .edit-line');
                for (const line of lines) {
                    const keyEl = line.querySelector('.edit-key');
                    const key = keyEl?.innerText.trim();
                    const valContainer = [...line.children].find(el => el !== keyEl && !el.matches('[data-skip]'));
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

}

export default EditorUI;