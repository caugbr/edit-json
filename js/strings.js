
class Strings {

    /** @type {Object} Customizable strings and icons */
    static defaultData = {
        ui: {
            popupTitle: 'Edit JSON',
            popupOkButtonLabel: 'Ok',
            popupCancelButtonLabel: 'Cancel',
            moveUpTitle: 'Move up',
            moveDownTitle: 'Move down',
            removeTitle: 'Remove item',
            collapseItemTitle: 'Collapse item',
            expandItemTitle: 'Expand item',
            selectType: 'Select type',
            add: 'Add',
            newKey: 'New key',
            confirmRemoval: 'Remove this item?',
            unnamed: 'Unnamed',
            viewSchema: 'View JSON schema for this field',
            hasSchema: 'This field has a JSON schema',
            viewSchemaTitle: 'Structure and validation rules for this field',
            layoutConfig: 'Layout settings',
            configTitle: 'Edit layout settings',
            save: 'Save',
            reset: 'Reset'
        },
        icon: {
            moveUpIcon: '<i class="fas fa-arrow-circle-up"></i>',
            moveDownIcon: '<i class="fas fa-arrow-circle-down"></i>',
            collapseItemIcon: '<i class="fas fa-chevron-circle-down"></i>',
            removeIcon: '<i class="fas fa-times-circle"></i>',
            expandItemIcon: '<i class="fas fa-chevron-circle-up"></i>',
            lockIcon: '<i class="fas fa-lock"></i>',
            closeIcon: '<i class="fas fa-times"></i>',
            popupClose: '<i class="fas fa-times"></i>',
            popupMaximize: '<i class="fas fa-window-maximize"></i>',
            popupRestore: '<i class="fas fa-window-restore"></i>',
            configIcon: '<i class="fas fa-cog"></i>'
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
            invalidFormat: '%path: must be a valid <code>%format</code>',
            tooFewChars: '%path: must have at least %min characters',
            tooMuchChars: '%path: must have at most %max characters',
            tooLowerNumber: '%path: must be greater than or equal to %min',
            tooHigherNumber: '%path: must be less than or equal to %max',
            enumOutOfRange: '%path: must be one of: %enum',
            tooFewElements: '%path: must contain at least %min items',
            tooMuchElements: '%path: must contain at most %max items',
            notUnique: '%path: items must be unique',
            missingRequired: '%path: missing required field',
            notAllowedField: '%path: field not allowed',
            categoryNotFoundSet: 'Strings.set: Category %category was not found',
            categoryNotFound: 'Strings.get: Category %category was not found, using default language "en"',
            keyNotFound: 'Strings.get: Key %key was not found',
            langNotFound: 'Failed to load %lang translation, using default language'
        },
        defaultValue: '?'
    };

    static data = { ...this.defaultData };

    static init(lang = null, tryNavLang = true) {
        if (lang) {
            if (this.languageExists(lang)) {
                this.loadLanguage(lang);
                return true;
            }
        } else if (tryNavLang && navigator.language) {
            if (this.languageExists(navigator.language)) {
                this.loadLanguage(navigator.language);
                return true;
            }
        }
        return false;
    }

    /**
     * Translate a string
     * @static
     * @param {string} key - String key
     * @param {string} category - Category. Default: 'ui'
     * @param {Object} [params] - Parameters for substitution
     * @returns {string} Translated text
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

    /**
     * Loads a json with a new set of strings
     * @static
     * @param {Object} obj - New strings
     */
    static async loadLanguage(lang) {
        try {
            const absUrl = this.absUrl(`../i18n/${lang}.json`);
            const response = await fetch(absUrl);
            const langData = await response.json();
            this.data = this.deepMerge(this.defaultData, langData);
        } catch (e) {
            console.warn(this.get('langNotFound', 'error', { lang }));
        }
    }

    /**
     * Verify if some languege exists in i18n as a JSON file
     * @static
     * @param {string} lang - Language code ('pt-BR')
     * @returns {Promise<boolean>} - True if file exists
     */
    static async languageExists(lang) {
        const url = this.absUrl(`../i18n/${lang}.json`);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    // Helpers
    static deepMerge(target, source) {
        const result = {...target};
        for (const key in source) {
            if (source[key] instanceof Object && target[key] instanceof Object) {
                result[key] = this.deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    static absUrl(url) {
        const baseUrl = document.currentScript?.src || import.meta.url;
        return new URL(url, baseUrl || window.location.origin).href;
    }

}

export default Strings;