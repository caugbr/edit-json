
/**
 * Class for managing design tokens as CSS custom properties with automatic naming conversion
 * @example
 * const designTokens = new DesignTokens();
 * designTokens.apply({ primaryColor: '#ff0000', spacingMd: '16px' });
 * const tokens = designTokens.get();
 */
class DesignTokens {
    element;
    static mode = 'flat';

    constructor(element = null, tokens = null) {
        this.setElement(element);
        if (tokens) {
            this.setTokens(tokens);
        }
    }

    /**
     * Sets the target element for token operations
     * @param {HTMLElement|null} [element=null] - Element to target (default: document.documentElement)
     * @throws {Error} If element is not null and not an HTMLElement
     * @example
     * setElement(document.getElementById('my-component'));
     * setElement(); // Resets to documentElement
     */
    setElement(element = null) {
        if (element && !(element instanceof HTMLElement)) {
            throw new Error('Element must be an instance of HTMLElement');
        }
        this.element = element ?? document.documentElement;
    }

    /**
     * Sets the design tokens for the instance
     * @param {Object|null} tokens - Design tokens object (null clears tokens)
     * @throws {Error} If tokens is not null and not an object
     * @example
     * setTokens({ colors: { primary: '#f00' } });
     * setTokens(null); // Clears tokens
     */
    setTokens(tokens) {
        if (tokens && typeof tokens !== 'object') {
            throw new Error('Tokens must be an object');
        }
        this.tokens = tokens;
    }

    /**
     * Converts camelCase JavaScript variable names to kebab-case CSS custom properties
     * @param {string} camelCaseName - The camelCase name (e.g. 'primaryColor')
     * @returns {string} The CSS custom property name (e.g. '--primary-color')
     * @example
     * designTokens.toCssVarName('primaryColor') // returns '--primary-color'
     * designTokens.toCssVarName('--already-kebab') // returns '--already-kebab'
     */
    toCssVarName(camelCaseName) {
        if (camelCaseName.startsWith('--')) {
            return '--' + camelCaseName.slice(2).replace(/-+/g, '-');
        }
        return '--' + camelCaseName.replace(/-+/g, '-').replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    /**
     * Converts CSS custom property names to camelCase JavaScript variables
     * @param {string} cssVarName - The CSS custom property name (e.g. '--primary-color')
     * @returns {string} The camelCase name (e.g. 'primaryColor')
     * @example
     * designTokens.toJsVarName('--primary-color') // returns 'primaryColor'
     * designTokens.toJsVarName('primary-color') // returns 'primaryColor'
     * designTokens.toJsVarName('alreadyCamelCase') // returns 'alreadyCamelCase'
     */
    toJsVarName(cssVarName) {
        if (!cssVarName.includes('-')) {
            return cssVarName;
        }
        const cleanName = cssVarName.startsWith('--') ? cssVarName.slice(2) : cssVarName;
        return cleanName.replace(/-+([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Converts CSS (--kebab-case) or JS (camelCase) variable names to Figma format ($kebab-case)
     * @param {string} name - Original name (e.g., '--brand-primary' or 'brandPrimary')
     * @returns {string} Name in Figma format (e.g., '$brand-primary')
     * @example
     * designTokens.toFigmaVarName('--brand-primary') // returns '$brand-primary'
     * designTokens.toFigmaVarName('brandPrimary') // returns '$brand-primary'
     */
    toFigmaVarName(name) {
        const kebabName = name.startsWith('--')
            ? name.slice(2)
            : name.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `$${kebabName}`;
    }

    /**
     * Converts a tokens object to Figma-compatible format ($kebab-case keys)
     * @param {Object.<string, string>} obj - Object with camelCase or --kebab-case keys
     * @returns {Object.<string, string>} Object with Figma-style keys
     * @example
     * designTokens.figmaNames({ brandPrimary: '#FF0000' }) // returns { '$brand-primary': '#FF0000' }
     */
    figmaNames(obj) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                this.toFigmaVarName(key),
                value
            ])
        );
    }

    /**
     * Converts flat camelCase tokens to a deep object structure
     * @param {Object} tokens - Flat tokens object with camelCase keys
     * @returns {Object} Nested tokens object (deep structure)
     * @example
     * flatToDeep({ colorsPrimary: '#f00' })
     * // Returns { colors: { primary: '#f00' } }
     */
    flatToDeep(tokens) {
        const deepTokens = {};
        for (const [key, value] of Object.entries(tokens)) {
            const keys = key.split(/(?=[A-Z])/).map(k => k.toLowerCase());
            let current = deepTokens;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
        }
        return deepTokens;
    }

    /**
     * Converts a deep object structure to flat camelCase tokens
     * @param {Object} tokens - Nested tokens object (deep structure)
     * @param {string} [prefix=''] - Optional prefix for recursive calls
     * @returns {Object} Flattened tokens object with camelCase keys
     * @example
     * deepToFlat({ colors: { primary: '#f00' } }) 
     * // Returns { colorsPrimary: '#f00' }
     */
    deepToFlat(tokens, prefix = '') {
        let flatTokens = {};
        for (const [key, value] of Object.entries(tokens)) {
            const newKey = prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
            if (typeof value === 'object' && !Array.isArray(value)) {
                flatTokens = { ...flatTokens, ...deepToFlat(value, newKey) };
            } else {
                flatTokens[newKey] = value;
            }
        }
        return flatTokens;
    }

    /**
     * Applies design tokens as CSS custom properties to an element
     * @param {Object.<string, string>} vars - Object with camelCase design tokens
     * @param {HTMLElement} [element] - Target element (default: document.documentElement)
     * @example
     * designTokens.apply({ primaryColor: '#ff0000', spacingMd: '16px' });
     * designTokens.apply({ textSize: '14px' }, document.querySelector('.my-element'));
     */
    apply(vars = null, element = null) {
        const el = element || this.element;
        if (element && !(element instanceof HTMLElement)) {
            throw new Error('Element must be an HTMLElement');
        }
        let tokens = vars || this.tokens;
        if (!tokens) {
            throw new Error('No tokens provided and this.tokens is not set');
        }
        if (DesignTokens.mode == 'deep') {
            tokens = this.deepToFlat(tokens);
        }
        for (const key in tokens) {
            el.style.setProperty(this.toCssVarName(key), tokens[key]);
        }
    }

    /**
     * Removes design tokens from an element
     * @param {Object.<string, string>} vars - Object with camelCase design tokens
     * @param {HTMLElement} [element] - Target element (default: document.documentElement)
     * @example
     * designTokens.remove();
     */
    remove(vars = null, element = null) {
        const el = element || this.element;
        if (element && !(element instanceof HTMLElement)) {
            throw new Error('Element must be an HTMLElement');
        }
        let tokens = vars || this.tokens;
        if (!tokens) {
            throw new Error('No tokens provided and this.tokens is not set');
        }
        if (DesignTokens.mode == 'deep') {
            tokens = this.deepToFlat(tokens);
        }
        for (const key in tokens) {
            el.style.removeProperty(this.toCssVarName(key));
        }
    }

    /**
     * Retrieves CSS custom properties from an element as camelCase tokens
     * @param {HTMLElement} [element] - Source element (default: document.documentElement)
     * @returns {Object.<string, string>} Object with camelCase design tokens
     * @example
     * const tokens = designTokens.get(); // gets all root variables
     * const cardTokens = designTokens.get(document.querySelector('.card')); // gets variables from specific element
     */
    get(element = null) {
        const el = element || this.element;
        if (element && !(element instanceof HTMLElement)) {
            throw new Error('Element must be an HTMLElement');
        }
        const style = getComputedStyle(el);
        const vars = {};
        for (const name of style) {
            if (name.startsWith('--')) {
                vars[this.toJsVarName(name)] = style.getPropertyValue(name).trim();
            }
        }
        return DesignTokens.mode == 'deep' ? this.flatToDeep(vars) : vars;
    }
}

export default DesignTokens;