
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
            schemaNotFound: 'Schema %schema not found in EditJSON.schemas'
        }
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
            category = 'ui';
        }
        let value = this.data[category][key] ?? key;
        
        Object.entries(params).forEach(([k, v]) => {
            value = value.replace(`%${k}`, v);
        });
        
        return value;
    }

    /**
     * Adds / updates the strings
     * @static
     * @param {Object} obj - New strings
     */
    static set(obj) {
        this.data = { ...this.data, ...obj };
    }

}

export default Strings;