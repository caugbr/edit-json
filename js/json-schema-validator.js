class JsonSchemaValidator {
    schema = null;
    
    constructor(schema) {
        this.schema = schema;
        this.formats = {
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^\d{2}:\d{2}(:\d{2})?$/,
            'datetime-local': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
            color: /^#[0-9A-Fa-f]{6}$/,
            email: /^[^\s@]+@[^\s@]+\.[a-z0-9]{2,10}$/
        };
    }

    validate(json, schema = null, path = '') {
        if (!schema) {
            schema = this.schema;
        }
        const errors = [];

        // Valida tipo do nó raiz
        if (schema.type && !this.validateType(json, schema.type)) {
            errors.push(`${path || 'root'}: este elemento deve ser do tipo ${schema.type}`);
        }

        // Valida campos obrigatórios
        if (schema.required) {
            for (const key of schema.required) {
                if (!(key in json)) {
                    errors.push(`${path}${path ? '.' : ''}${key}: campo obrigatório ausente`);
                }
            }
        }

        // Valida propriedades
        if (schema.properties) {
            for (const key in json) {
                if (!(key in schema.properties) && schema.additionalProperties === false) {
                errors.push(`${path}${path ? '.' : ''}${key}: campo não permitido`);
                continue;
                }
                if (key in schema.properties) {
                    const propSchema = schema.properties[key];
                    const value = json[key];
                    const newPath = path ? `${path}.${key}` : key;

                    // Valida tipo
                    if (propSchema.type && !this.validateType(value, propSchema.type)) {
                        errors.push(`${newPath}: deve ser do tipo ${propSchema.type}`);
                    }

                    // Valida formato (para strings)
                    if (propSchema.type === 'string' && propSchema.format) {
                        if (!this.validateFormat(value, propSchema.format)) {
                            errors.push(`${newPath}: deve ser um ${propSchema.format} válido`);
                        }
                    }

                    // Valida restrições de string
                    if (propSchema.minLength && typeof value === 'string' && value.length < propSchema.minLength) {
                        errors.push(`${newPath}: deve ter pelo menos ${propSchema.minLength} caracteres`);
                    }
                    if (propSchema.maxLength && typeof value === 'string' && value.length > propSchema.maxLength) {
                        errors.push(`${newPath}: deve ter no máximo ${propSchema.maxLength} caracteres`);
                    }

                    // Valida restrições de número
                    if (propSchema.minimum && typeof value === 'number' && value < propSchema.minimum) {
                        errors.push(`${newPath}: deve ser maior ou igual a ${propSchema.minimum}`);
                    }
                    if (propSchema.maximum && typeof value === 'number' && value > propSchema.maximum) {
                        errors.push(`${newPath}: deve ser menor ou igual a ${propSchema.maximum}`);
                    }

                    // Valida enum
                    if (propSchema.enum && !propSchema.enum.includes(value)) {
                        errors.push(`${newPath}: deve ser um dos valores: ${propSchema.enum.join(', ')}`);
                    }

                    // Valida arrays
                    if (propSchema.type === 'array' && Array.isArray(value)) {
                        if (propSchema.minItems && value.length < propSchema.minItems) {
                            errors.push(`${newPath}: deve ter pelo menos ${propSchema.minItems} itens`);
                        }
                        if (propSchema.maxItems && value.length > propSchema.maxItems) {
                            errors.push(`${newPath}: deve ter no máximo ${propSchema.maxItems} itens`);
                        }
                        if (propSchema.uniqueItems && !this.validateUniqueItems(value)) {
                            errors.push(`${newPath}: itens devem ser únicos`);
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
    
    static generateFromSchema(schema) {
        // Função auxiliar para escolher valor padrão com base no tipo
        function getDefaultValue(type, schema) {
            if (schema.enum) {
                // Usa o primeiro valor do enum, se disponível
                return schema.enum[0] || null;
            }
            switch (type) {
                case 'string':
                    return schema.minLength > 0 ? 'placeholder' : '';
                case 'number':
                case 'integer':
                    return 0;
                case 'boolean':
                    return true;
                case 'array':
                    return [];
                case 'object':
                    return {};
                default:
                    return null;
            }
        }
    
        // Lida com objetos
        if (schema.type === 'object') {
            const result = {};
            const properties = schema.properties || {};
            const required = schema.required || [];
    
            for (const key in properties) {
                const propSchema = properties[key];
                // Inclui apenas se é requerido ou para preencher boilerplate
                if (required.includes(key) || true) {
                    result[key] = this.generateFromSchema(propSchema);
                }
            }
            return result;
        }
    
        // Lida com arrays
        if (schema.type === 'array') {
            const itemsSchema = schema.items || {};
            // Retorna array vazio ou com um item inicial (ajustável)
            return [this.generateFromSchema(itemsSchema)];
        }
    
        // Lida com tipos primitivos
        return getDefaultValue(schema.type, schema);
    }

    validateType(value, type) {
        if (type === 'null') return value === null;
        if (type === 'array') return Array.isArray(value);
        if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
        return typeof value === type;
    }

    validateFormat(value, format) {
        if (typeof value !== 'string') return false;
        return this.formats[format] ? this.formats[format].test(value) : true;
    }

    validateUniqueItems(array) {
        for (let i = 0; i < array.length; i++) {
            for (let j = i + 1; j < array.length; j++) {
                if (this.deepEqual(array[i], array[j])) {
                    return false;
                }
            }
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