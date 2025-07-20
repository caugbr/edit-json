import Strings from "./strings.js";

class JsonSchemaValidator {
    schema = null;
    
    constructor(schema) {
        this.schema = schema;
        this.formats = {
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^\d{2}:\d{2}(:\d{2})?$/,
            'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
            color: /^#([0-9a-f]{6}|[0-9a-f]{3})$/i,
            email: /^[^\s@]+@[^\s@]+\.[a-z0-9]{2,10}$/
        };
    }

    validate(json, schema = null, path = 'root') {
        if (!schema) {
            if (!this.schema) {
                return [];
            }
            schema = this.schema;
        }
        const errors = [];

        // Valida tipo do nó raiz
        if (schema.type && !this.validateType(json, schema.type)) {
            errors.push(Strings.get('typeNotMatch', 'error', { path, type: schema.type }));
        }

        // Valida campos obrigatórios
        if (schema.required) {
            for (const key of schema.required) {
                if (!(key in json)) {
                    errors.push(Strings.get('missingRequired', 'error', { path: `${path}${path ? '.' : ''}${key}` }));
                }
            }
        }

        // Valida propriedades
        if (schema.properties) {
            for (const key in json) {
                if (!(key in schema.properties) && schema.additionalProperties === false) {
                    errors.push(Strings.get('notAllowedField', 'error', { path: `${path}${path ? '.' : ''}${key}` }));
                    continue;
                }
                if (key in schema.properties) {
                    const propSchema = schema.properties[key];
                    const value = json[key];
                    const newPath = path ? `${path}.${key}` : key;

                    // Valida tipo
                    if (Array.isArray(propSchema.type)) {
                        if (!propSchema.type.some(t => this.validateType(value, t))) {
                            errors.push(Strings.get('typeNotMatchArr', 'error', { path: newPath, types: propSchema.type.join(', ') }));
                        }
                    } else {
                        if (propSchema.type && !this.validateType(value, propSchema.type)) {
                            errors.push(Strings.get('typeNotMatch', 'error', { path: newPath, type: propSchema.type }));
                        }
                    }

                    // Padrões regex para strings (pattern)
                    if (propSchema.pattern && typeof value === 'string') {
                        const regex = new RegExp(propSchema.pattern)
                        if (!regex.test(value)) {
                            errors.push(Strings.get('patternNotMatch', 'error', { path: newPath, pattern: propSchema.pattern }));
                        }
                    }

                    // Validação de const (valor exato)
                    if ('const' in propSchema && !this.deepEqual(value, propSchema.const)) {
                        errors.push(Strings.get('constDifferent', 'error', { path: newPath, const: propSchema.const }));
                    }

                    // Valida formato (para strings)
                    if (propSchema.type === 'string' && propSchema.format) {
                        if (!this.validateFormat(value, propSchema.format)) {
                            errors.push(Strings.get('invalidFormat', 'error', { path: newPath, format: propSchema.format }));
                        }
                    }

                    // Valida restrições de string
                    if (propSchema.minLength && typeof value === 'string' && value.length < propSchema.minLength) {
                        errors.push(Strings.get('tooFewChars', 'error', { path: newPath, min: propSchema.minLength }));
                    }
                    if (propSchema.maxLength && typeof value === 'string' && value.length > propSchema.maxLength) {
                        errors.push(Strings.get('tooMuchChars', 'error', { path: newPath, max: propSchema.maxLength }));
                    }

                    // Valida restrições de número
                    if (propSchema.minimum && typeof value === 'number' && value < propSchema.minimum) {
                        errors.push(Strings.get('tooLowerNumber', 'error', { path: newPath, min: propSchema.minimum }));
                    }
                    if (propSchema.maximum && typeof value === 'number' && value > propSchema.maximum) {
                        errors.push(Strings.get('tooHigherNumber', 'error', { path: newPath, max: propSchema.maximum }));
                    }

                    // Valida enum
                    if (propSchema.enum && !propSchema.enum.includes(value)) {
                        errors.push(Strings.get('enumOutOfRange', 'error', { path: newPath, enum: propSchema.enum.join(', ') }));
                    }

                    // Valida arrays
                    if (propSchema.type === 'array' && Array.isArray(value)) {
                        if (propSchema.minItems && value.length < propSchema.minItems) {
                            errors.push(Strings.get('tooFewElements', 'error', { path: newPath, min: propSchema.minItems }));
                        }
                        if (propSchema.maxItems && value.length > propSchema.maxItems) {
                            errors.push(Strings.get('tooMuchElements', 'error', { path: newPath, max: propSchema.maxItems }));
                        }
                        if (propSchema.uniqueItems && !this.validateUniqueItems(value)) {
                            errors.push(Strings.get('notUnique', 'error', { path: newPath }));
                        }
                        if (propSchema.items) {
                            for (let i = 0; i < value.length; i++) {
                                const itemErrors = this.validate(value[i], propSchema.items, `${newPath}[${i}]`);
                                errors.push(...itemErrors);
                            }
                        }
                    }

                    // Valida objetos aninhados
                    if (propSchema.type === 'object' && value) {
                        const nestedErrors = this.validate(value, propSchema, newPath);
                        errors.push(...nestedErrors);
                    }
                }
            }
        }

        return errors;
    }

    validateType(value, type) {
        if (type === 'null') return value === null;
        if (type === 'number') return typeof value === 'number' && !isNaN(value);
        if (type === 'array') return Array.isArray(value);
        if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
        return typeof value === type;
    }

    validateFormat(value, format) {
        if (typeof value !== 'string') return false;
        return this.formats[format] ? this.formats[format].test(value) : true;
    }

    validateUniqueItems(array) {
        const seen = new Set();
        for (const item of array) {
            const key = JSON.stringify(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
        }
        return true;
    }

    deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.deepEqual(a[i], b[i])) return false;
            }
            return true;
        }
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
}

export default JsonSchemaValidator;