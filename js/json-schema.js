import JsonSchemaValidator from './json-schema-validator.js';
import { $single } from './util.js';

class JsonSchema {

    schema;
    currentPath = ['root'];
    pathStyle = 'dots'; // dots | js | pointer

    constructor(schema = null) {
        if (schema) {
            this.setSchema(schema);
        }
    }

    /**
     * Set JSON Schema
     * @param {Object} schema - Schema
     */
    setSchema(schema) {
        this.schema = schema;
    }

    /**
     * Returns current path in specified format
     * @param {'js'|'pointer'|'dots'|null} style - Output format (default: instance pathStyle)
     * @returns {string} Formatted path
     */
    getCurrentPath(style = null) {
        style = style ?? this.pathStyle;
        const path = this.currentPath.join('.');
        if (style == 'js') {
            return path.replace(/\.([0-9]+)(?=\.|$)/g, "[$1]");
        }
        if (style == 'pointer') {
            return path.replace('root', '#').replace(/\./g, '/');
        }
        return path;
    }

    /**
     * Converts path string to array format
     * @param {string} str - Path in any supported format
     * @returns {string[]} Path segments array
     */
    pathArrayFromString(str) {
        if (!str) return ['root'];
        if (str.startsWith('#')) {
            return str.replace('#', 'root').split('/').filter(Boolean)
                .map(e => /^\d+$/.test(e) ? parseInt(e) : e);
        }
        return str.trim().split(/\.|\[|\]\.?/).filter(Boolean)
            .map(e => /^\d+$/.test(e) ? parseInt(e) : e);
    }

    /**
     * Appends a segment to current path
     * @param {string|number} key - Path segment to add
     */
    pushPath(key) {
        this.currentPath.push(key);
    }

    /**
     * Removes the last segment from current path
     */
    popPath() {
        this.currentPath.pop();
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

    /**
     * Applies the css class 'required' on each required item on the given object
     * @param {object|null} obj - The HTML element of the object on editor
     */
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
        const required = schema.required ?? [];
        const props = root.children; // Pega todos os filhos diretos
        const editLines = Array.from(props).filter(el => el.matches('.edit-line'));

        editLines.forEach(prop => {
            const key = $single('.edit-key', prop).innerText;
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
     * Creates the initial content of a fielod, based on schema
     * @param {Object} [schema] - The schema to use. Fallback to this.schema
     */
    generateFromSchema(schema = null) {
        schema = schema ?? this.schema;
        function getDefaultValue(type, schema) {
            if (schema.enum) {
                return schema.enum[0] || null;
            }
            switch (type) {
                case 'string': return schema.minLength > 0 ? 'placeholder' : '';
                case 'number': case 'integer': return 0;
                case 'boolean': return true;
                case 'array': return [];
                case 'object': return {};
                default: return null;
            }
        }
        if (schema.type === 'object') {
            const result = {};
            const properties = schema.properties || {};
            const required = schema.required || [];
            for (const key in properties) {
                const propSchema = properties[key];
                if (required.includes(key) || true) {
                    result[key] = this.generateFromSchema(propSchema);
                }
            }
            return result;
        }
        if (schema.type === 'array') {
            const itemsSchema = schema.items || {};
            const items = this.generateFromSchema(itemsSchema)
            return items ? [items] : [];
        }
        return getDefaultValue(schema.type, schema);
    }

    validateJson(json) {
        const jsv = new JsonSchemaValidator(this.schema);
        return jsv.validate(json);
    }
}

export default JsonSchema;