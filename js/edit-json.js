// import '../css/edit-json.css';
import Popup from './popup.js';
import JsonSchemaValidator from './json-schema-validator.js';
import { $single, $apply, tag, isPlainObject, rootEvent, copyObject } from './util.js';

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

    /** @type {Object} JSON Schema to validate root element */
    schema = null;

    /** @type {Object} JSON Schemas repository */
    static schemas = {};

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
        unnamed: 'Unnamed',
        schemaNotFound: 'Schema %s not found in EditJSON.schemas',
        lockIcon: '<i class="fas fa-lock"></i>',
        closeIcon: '<i class="fas fa-times"></i>',
        viewSchema: 'View JSON schema for this field',
        hasSchema: 'There is a JSON schema for this field',
        viewSchemaTitle: 'Structure and validation rules for this field'
    };

    static config = {
        /** @type {Boolean} Can user insert new object / array items? */
        insertItems: true,
        /** @type {Boolean} Can user move object / array items? */
        moveItems: true,
        /** @type {Boolean} Can user remove object / array items? */
        removeItems: true,
        /** @type {Boolean} Can user edit object keys? */
        editKeys: true,
        /** @type {Boolean} Let users see the JSON Schema? */
        visibleSchema: true
    };

    config = null;
    currentPath = ['root'];

    /**
     * Creates a JSON editor instance
     * @constructor
     * @param {HTMLElement|null} jsonElement - JSON input/output element
     */
    constructor(jsonElement = null, schema = null, config = null) {
        
        this.setConfig(config);
        if (schema) {
            this.setSchema(schema);
        }
        if (jsonElement) {
            if (this.schema && !jsonElement.value) {
                const jsn = JsonSchemaValidator.generateFromSchema(this.schema);
                jsonElement.value = JSON.stringify(jsn);
            }
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
     * Set config
     * @param {Object} config - Config object
     */
    setConfig(config = null) {
        this.config = config ?? EditJSON.config;
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
     * Set JSON Schema
     * @param {Object} schema - Schema
     */
    setSchema(schema) {
        this.schema = schema;
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

            let schema = null;
            const schemaKey = el.dataset.schema;
            if (schemaKey) {
                if (!!EditJSON.schemas[schemaKey]) {
                    schema = copyObject(EditJSON.schemas[schemaKey]);
                } else {
                    console.warn(this.strings.schemaNotFound.replace('%s', schemaKey));
                }
            }

            const editor = new EditJSON(jsonEl, schema);
            el.addEventListener('click', () => {
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
        console.log('set', jsonElement.value)
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
                + (this.schema === null ? '' : ' has-schema') 
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
        this.showSchemaLink();
    }

    showSchemaLink() {
        if (this.schema) {
            const showSchema = tag(
                'a', 
                { class: 'show-schema disabled', title: EditJSON.strings.hasSchema }, 
                EditJSON.strings.lockIcon
            );
            if (this.config.visibleSchema) {
                showSchema.title = EditJSON.strings.viewSchema;
                showSchema.classList.remove('disabled');
                showSchema.addEventListener('click', () => {
                    const close = tag('a', { class: 'close-schema-overlay' }, EditJSON.strings.closeIcon);
                    close.addEventListener('click', () => overlay.remove());
                    const wrap = tag('pre', { class: 'wrap-schema' }, JSON.stringify(this.schema, null, 4));
                    const wrapper = tag('div', {}, [tag('h3', {}, EditJSON.strings.viewSchemaTitle), wrap]);
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
        this.popup = new Popup(EditJSON.strings.popupTitle, this.htmlElement);
        this.htmlElement.style.display = 'block';
        const cancelButton = tag('button', { type: 'button', class: 'close-popup secondary' }, EditJSON.strings.popupCancelButtonLabel);
        const okButton = tag('button', { type: 'button', class: 'save-json' }, EditJSON.strings.popupOkButtonLabel);
        cancelButton.addEventListener('click', () => this.popup.close());
        okButton.addEventListener('click', () => {
            const json = this.extractFromHtml();
            if (null !== this.schema) {
                const jsv = new JsonSchemaValidator(this.schema);
                const errors = jsv.validate(json);
                console.log('errors', errors)
            }
            this.jsonElement.value = JSON.stringify(json, null, 4);
            this.popup.close();
        });
        this.popup.addFooterButton(cancelButton);
        this.popup.addFooterButton(okButton);
        this.popup.open();
        setTimeout(() => this.applyRequiredClass(), 120);
    }

    /**
     * Generates a <select> for a key with an enum in the schema, based on currentPath.
     * @returns {string|false} - HTML for <select> if enum exists, false otherwise.
     */
    enumField(value, path = null) {
        if (!this.schema) {
            return false;
        }
        const schema = this.getSchemaForPath(path ?? this.getCurrentPath()) || {};
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
            const attrs = { id: `enum_${this.currentPath.join('_')}`, class: 'edit-value' };
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
        this.currentPath.push(key); // Acrescenta chave ao path
        const schema = this.getSchemaForPath(this.getCurrentPath()) || null;
        const contenteditable = schema ? false : this.config.editKeys;
        const keyText = tag('span', { contenteditable, spellcheck: false, class: 'edit-key' }, key);
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
        const attrs = { class: 'edit-line', 'data-path': this.getCurrentPath() };
        this.currentPath.pop(); // Decresce path
        return tag('div', attrs, [ keyText, ": ", valText ]);
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

    applyRequiredClass(obj = null) {
        if (!this.schema) {
            return;
        }
        const root = obj ?? $single('.popup-popup .edit-json [data-path="root"]');
        if (!root) {
            return;
        }
        const path = root.dataset?.path ?? '';
        const schema = this.getSchemaForPath(path);
        console.log('applyRequiredClass', schema)
        const required = schema.required ?? [];
        const props = root.children; // Pega todos os filhos diretos
        const editLines = Array.from(props).filter(el => el.matches('.edit-line'));

        editLines.forEach(prop => {
            const key = $single('.edit-key', prop).innerText;
            console.log('KEY', key)
            if (required.includes(key)) {
                prop.classList.add('required');
            }
            const innerObj = prop.querySelector('.edit-object');
            if (innerObj) {
                this.applyRequiredClass(innerObj);
            }
        });
    }

    /**
     * Creates appropriate HTML for value based on its type
     * @param {*} val - Value to render
     * @param {boolean} [actions=true] - Whether to include action buttons
     * @returns {HTMLElement} Element containing the edit control
     */
    valHtml(val, actions = true, path = '') {
        let valText;
        switch (this.getType(val)) {
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
                const dateType = this.isDateTime(val);
                if (dateType) {
                    valText = this.bidirectTextInput(dateType, val);
                } else if (this.isColor(val)) {
                    valText = this.bidirectTextInput('color', val);
                } else {
                    valText = this.enumField(val) || tag('span', { contenteditable: true, class: 'edit-value' }, val);
                }
        }
        const attrs = { class: 'input-wrapper' };
        if (path) {
            attrs['data-path'] = path;
        }
        if (actions) {
            return tag('span', attrs, [valText, this.makeActions()]);
        }
        return tag('span', attrs, valText);
    }

    bidirectTextInput(type, value) {
        const txt = tag('span', { contenteditable: true, class: 'edit-value' }, value);
        const inp = tag('input', { type, value, class: `edit-value-${type}-input` });
        const line = tag('span', { class: `edit-value-${type}` }, [ txt, inp ]);
        txt.addEventListener('focus', () => line.classList.add('focused'));
        txt.addEventListener('blur', () => line.classList.remove('focused'));
        txt.addEventListener('input', () => inp.value = txt.innerText.trim());
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
                title: EditJSON.strings.removeTitle, 
                'data-skip': true,
                class: 'remove-item' 
            }, EditJSON.strings.removeIcon);
            elems.push(removeButton);
        }
        if (cfg?.canMove ?? this.config.moveItems) {
            const upButton = tag('a', { 
                href: '#', 
                class: 'up-item', 
                'data-skip': true,
                title: EditJSON.strings.moveUpTitle 
            }, EditJSON.strings.moveUpIcon);
            const downButton = tag('a', { 
                href: '#', 
                class: 'down-item', 
                'data-skip': true,
                title: EditJSON.strings.moveDownTitle 
            }, EditJSON.strings.moveDownIcon);
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
        const schema = this.getSchemaForPath(this.getCurrentPath()) || null;
        const canInsert = schema ? schema.ejCanInsertItems ?? this.config.insertItems : this.config.insertItems;
        const canMove = schema ? schema.ejCanMoveItems ?? this.config.moveItems : this.config.moveItems;
        const canRemove = schema ? schema.ejCanRemoveItems ?? this.config.removeItems : this.config.removeItems;
        const items = [];
        arr.forEach((item, index) => {
            this.currentPath.push(index);
            items.push(this.valHtml(item, true, this.getCurrentPath()));
            this.currentPath.pop();
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
        const editor = tag('span', { class: cls.join(' '), 'data-path': this.getCurrentPath() }, items);
        return tag('span', { class: 'edit-array-wrapper' }, [...this.toggleLinks(), editor]);
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
        return tag('div', { class: 'add-obj-item', 'data-skip': true }, [ valField, addButton ]);
    }

    /**
     * Creates interface for object editing
     * @param {Object} obj - Object to edit
     * @returns {HTMLElement} SPAN element containing object fields
     */
    editObject(obj) {
        const schema = this.getSchemaForPath(this.getCurrentPath()) || {};
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
        const editor = tag('span', { class: cls.join(' '), 'data-path': this.getCurrentPath() }, lines);
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
        const keyField = tag('input', { type: 'text', class: 'key', placeholder: EditJSON.strings.newKey });
        keyField.addEventListener('input', event => this.enableAddButton(event.target));
        const keyEl = tag('span', {}, ['"', keyField, '": ']);

        const options = [tag('option', { value: '', selected: true, disabled: true }, EditJSON.strings.selectType)];
        types.forEach(tp => options.push(tag('option', { value: tp }, tp)));
        const valField = tag('select', { class: 'value' }, options);
        valField.addEventListener('input', event => this.enableAddButton(event.target));
        
        const addButton = tag('button', { type: 'button', disabled: true }, EditJSON.strings.add);
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
            title: EditJSON.strings.collapseItemTitle, 
            href: '#' 
        }, EditJSON.strings.collapseItemIcon);
        const toggleDown = tag('a', { 
            class: 'toggle down', 
            'data-skip': true,
            title: EditJSON.strings.expandItemTitle, 
            href: '#' 
        }, EditJSON.strings.expandItemIcon);
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
     * Check for duplicated keys in objects
     * @param {string} key - Key to be validated
     * @returns {boolean}
     */
    isDuplicatedKey(key) {
        const wrapper = key.closest('.edit-object');
        const keys = wrapper.querySelectorAll('.edit-key');
        const filtered = Array.from(keys).filter(e => e.innerText.trim() === key.innerText.trim());
        return filtered.length > 1;
    }

    /**
     * Validates the typed key
     * @param {string} key - Key to be validated
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
        if (input && (!input.value || !this.isValidKey(input.value))) {
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
        return /^#([a-f0-9]{3}|[a-f0-9]{6})$/i.test(val.trim());
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

    getCurrentPath() {
        const path = this.currentPath.join('.');
        return path.replace(/\.([0-9]+)(?=\.|$)/g, "[$1]");
    }

    /**
     * Retrieves the schema for a given path in the JSON structure.
     * @param {string} path - The path to the node (e.g., 'root.obj1.arr[0].chave').
     * @returns {object|null} - The schema for the path, or null if not found.
     */
    getSchemaForPath(path) {
        if (!this.schema) {
            return null;
        }
        const pathParts = path.split(/\.|\[|\]\.?/).filter(part => part);
        let currentSchema = this.schema;
        for (const part of pathParts) {
            if (!currentSchema) {
                return null;
            }
            if (part === 'root' && pathParts[0] === 'root') {
                continue;
            }
            if (part.match(/^\d+$/) && currentSchema.items) {
                currentSchema = currentSchema.items;
            }
            else if (currentSchema.properties && currentSchema.properties[part]) {
                currentSchema = currentSchema.properties[part];
            }
            else if (currentSchema.additionalProperties && typeof currentSchema.additionalProperties === 'object') {
                currentSchema = currentSchema.additionalProperties;
            }
            else {
                return null;
            }
        }
        return currentSchema || null;
    }
}

export default EditJSON;