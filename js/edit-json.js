/**
 * EditJSON
 * --------
 * A safe JSON editor for HTML form fields
 * 
 * By Cau Guanabara (https://github.com/caugbr)
 * Released in 2025-07-20
 * 
 * This project in GitHub: https://github.com/caugbr/edit-json
 */

// import '../css/edit-json.css';
import Popup from './popup.js';
import Strings from './strings.js';
import JsonSchema from './json-schema.js';
import EditorUI from './editor-ui.js';
import { $apply, isPlainObject, copyObject } from './util.js';

/**
 * Class for interactive and safe JSON edition
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

    /** @type {Object} JSON Schemas repository */
    static schemas = {};

    /** @type {string} CSS selector for trigger elements */
    static selector = '[data-json-editor]';

    /** @type {Object} Global configuration values */
    static config = {
        /** @type {Boolean} Can user insert new object / array items? */
        insertItems: true,
        /** @type {Boolean} Can user move object / array items? */
        moveItems: true,
        /** @type {Boolean} Can user remove object / array items? */
        removeItems: true,
        /** @type {Boolean} Can user edit object keys? */
        editKeys: true,
        /** @type {Boolean} Let user see JSON Schema? */
        viewSchema: true,
        /** @type {Boolean} Let user personalize interface? */
        viewConfig: false,
        /** @type {Boolean} Let save JSON if is invalid against the schema? */
        blockIfInvalid: true
    };

    /** @type {Object} Local configuration values */
    config = null;

    /** @type {Object} Instance of EditorUI */
    ui = null;

    /** @type {Object} Instance of JsonSchema */
    jSchema = null;

    /**
     * Creates a JSON editor instance
     * @constructor
     * @param {HTMLElement|null} jsonElement - JSON input/output element
     */
    constructor(jsonElement = null, schema = null, config = null) {
        Strings.init();

        this.jSchema = new JsonSchema();
        
        this.setConfig(config);
        if (schema) {
            this.jSchema.setSchema(schema);
        }
        if (jsonElement) {
            if (this.jSchema.schema && !jsonElement.value) {
                const jsn = this.jSchema.generateFromSchema();
                jsonElement.value = JSON.stringify(jsn);
            }
        }
        this.ui = new EditorUI(jsonElement, this.jSchema, this.config, EditJSON);
    }

    /**
     * Set config
     * @param {Object} config - Config object
     */
    setConfig(config = {}) {
        this.config = { ...EditJSON.config, ...config };
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
                console.warn(Strings.get('elementNotFound'));
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
                    console.warn(Strings.get('schemaNotFound').replace('%s', schemaKey));
                }
            }

            const editor = new EditJSON(jsonEl, schema);
            el.addEventListener('click', () => {
                editor.ui.openEditor();
            });
        });
    }

    /**
     * Check for duplicated keys in objects
     * @param {string} key - Key to be validated
     * @returns {boolean}
     */
    static isDuplicatedKey(key) {
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
    static isValidKey(key) {
        return typeof key === 'string' && 
            key.length > 0 &&
            !/[\u0000-\u001F"\\]/.test(key) &&
            !['__proto__', 'constructor'].includes(key);
    }

    /**
     * Determines variable type (improved for objects/arrays)
     * @param {*} variable - Value to check
     * @returns {string} Value type ('object', 'array', 'null', etc.)
     */
    static getType(variable) {
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
    static isColor(val) {
        return /^(#([a-f0-9]{6}|[a-f0-9]{3})|rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0\.\d+)\s*\))$/i.test(val.trim());
    }

    /**
     * Checks if string represents a date/time
     * @param {string} val - Value to test
     * @returns {string|false} Date type ('date', 'datetime-local', 'time') or false
     */
    static isDateTime(val) {
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

export { Strings };
export default EditJSON;