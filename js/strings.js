
class Strings {

    /** @type {Object} Customizable strings and icons */
    static data = {
        ui: {
            popupTitle: 'Edit JSON',
            popupOkButtonLabel: 'Done',
            popupCancelButtonLabel: 'Cancel',
            moveUpTitle: 'Move up',
            moveDownTitle: 'Move down',
            removeTitle: 'Remove this item',
            collapseItemTitle: 'Collapse item',
            expandItemTitle: 'Expand item',
            selectType: 'Select type',
            add: 'Add',
            newKey: 'New key',
            confirmRemoval: 'Remove this item?',
            unnamed: 'Unnamed',
            viewSchema: 'View JSON schema for this field',
            hasSchema: 'There is a JSON schema for this field',
            viewSchemaTitle: 'Structure and validation rules for this field'
        },
        icon: {
            moveUpIcon: '<i class="fas fa-arrow-circle-up"></i>',
            moveDownIcon: '<i class="fas fa-arrow-circle-down"></i>',
            collapseItemIcon: '<i class="fas fa-chevron-circle-down"></i>',
            removeIcon: '<i class="fas fa-times-circle"></i>',
            expandItemIcon: '<i class="fas fa-chevron-circle-up"></i>',
            lockIcon: '<i class="fas fa-lock"></i>',
            closeIcon: '<i class="fas fa-times"></i>'
        },
        error: {
            targetElementNotFound: 'Target element not found.',
            noKeyError: 'The key is required.',
            elementNotFound: 'Target element not found',
            invalidJson: 'Invalid JSON (%error)',
            jsonNotSet: 'JSON is not set',
            schemaNotFound: 'Schema %schema not found in EditJSON.schemas',
            typeNotMatchArr: '%path: must be one of the following types: %types',
            typeNotMatch: '%path: must be of type %type',
            patternNotMatch: '%path: must match pattern %pattern',
            constDifferent: '%path: must be exactly %const',
            invalidFormat: '%path: must be a valid %format',
            tooFewChars: '%path: must have at least %length characters',
            tooMuchChars: '%path: must have at most %length characters',
            tooLowerNumber: '%path: must be greater than or equal to %min',
            tooHigherNumber: '%path: must be less than or equal to %max',
            enumOutOfRange: '%path: must be one of: %enum',
            tooFewElements: '%path: must contain at least %items items',
            tooMuchElements: '%path: must contain at most %items items',
            notUnique: '%path: items must be unique',
            missingRequired: '%path: missing reuired field',
            notAllowedField: '%path: not allowed field insertion',
            categoryNotFoundSet: 'Strings.set: Category %category was not found',
            categoryNotFound: 'Strings.get: Category %category was not found',
            keyNotFound: 'Strings.get: Key %key was not found',
        },
        defaultValue: '?'
    };

    /**
     * Obtém uma string traduzida
     * @param {string} key - Chave desejada
     * @param {string} category - Categoria. Padrão: 'ui'
     * @param {Object} [params] - Parâmetros para substituição
     * @returns {string} Texto traduzido
     */
    static get(key, category = 'ui', params = {}) {
        if (!this.data[category]) {
            console.warn(Strings.get('categoryNotFound', 'error', { category }));
            category = 'ui';
        }
        if (!this.data[category][key] ?? false) {
            console.warn(Strings.get('keyNotFound', 'error', { key }));
            return Strings.data.defaultValue;
        }
        let value = this.data[category][key];
        
        Object.entries(params).forEach(([k, v]) => {
            value = value.replace(`%${k}`, v);
        });
        
        return value;
    }

    /**
     * Adds / updates the strings in given category
     * @static
     * @param {Object} obj - New strings
     */
    static set(obj, category = 'ui') {
        if (!this.data[category]) {
            console.warn(Strings.get('categoryNotFoundSet', 'error', { category }));
            return false;
        }
        this.data[category] = { ...this.data[category], ...obj };
        return true;
    }

}

export default Strings;