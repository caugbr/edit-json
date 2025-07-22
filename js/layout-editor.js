
import Strings from "./strings.js";
import DesignTokens from "./design-tokens.js";
import { importJson, camelToNormal, tag, relToAbs, isColor, $single } from "./util.js";

// const tokens = await importJson(relToAbs('../layout/editor.json'));

class LayoutEditor {
    htmlElement = null;
    jsonTokens = null;
    storeTokens = null;
    tokens = null;
    dt = null;
    enableButtons;

    constructor(element, enableButtons) {
        this.htmlElement = element;
        this.popupOverlay = element.closest('.popup-overlay');
        this.enableButtons = (en) => enableButtons(en);
        this.dt = new DesignTokens(this.popupOverlay);
    }

    static async create(element, enableButtons) {
        const obj = new LayoutEditor(element, enableButtons);
        await obj.getJsonTokens();
        obj.getStoreTokens();
        obj.setTokens();
        obj.apply();
        return obj;
    }

    apply() {
        this.dt.apply();
    }

    saveLocalTokens() {
        window.localStorage.setItem('designTokens', JSON.stringify(this.tokens));
    }

    resetTokens() {
        window.localStorage.removeItem('designTokens');
        this.tokens = this.jsonTokens;
        this.dt.setTokens(this.tokens);
        this.dt.remove();
        for (const key in this.tokens) {
            const input = $single(`input#${key}`);
            try {
                input.value = this.tokens[key];
            } catch(e) {
                input.innerText = this.tokens[key];
            }
        }
    }

    getCurrentTokens() {
        return this.dt.get();
    }

    async getJsonTokens() {
        const tokens = await importJson(relToAbs('../layout/editor.json'));
        return this.jsonTokens = tokens;
    }

    getStoreTokens() {
        const rules = JSON.parse(window.localStorage.getItem('designTokens') || '{}');
        return this.storeTokens = rules;
    }

    setTokens() {
        this.tokens = { ...this.jsonTokens, ...this.storeTokens };
        console.log('dt::setTokens', this.tokens)
        this.dt.setTokens(this.tokens);
    }

    async showConfigLink() {
        const showConfig = tag(
            'a', 
            { class: 'show-config', title: Strings.get('layoutConfig') }, 
            Strings.get('configIcon', 'icon')
        );
        showConfig.addEventListener('click', event => {
            event.preventDefault();
            this.enableButtons(false);
            const close = tag('a', { class: 'close-config-overlay' }, Strings.get('closeIcon', 'icon'));
            close.addEventListener('click', () => {
                this.enableButtons(true);
                overlay.remove();
            });
            const title = tag('h3', {}, Strings.get('configTitle'));
            const lis = [];
            for (const key in this.tokens) {
                const name = camelToNormal(key);
                const label = tag('label', { for: key }, name);
                const li = tag('li', {}, [label, this.editField(key, this.tokens[key])]);
                lis.push(li);
            }
            const wrap = tag('ul', { class: 'wrap-config' }, lis);
            const save = tag('button', { type: 'button', class: 'save-button' }, Strings.get('save'));
            save.addEventListener('click', () => {
                this.dt.apply();
                this.saveLocalTokens();
                close.click();
            });
            const reset = tag('button', { type: 'button', class: 'reset-button secondary' }, Strings.get('reset'));
            reset.addEventListener('click', () => {
                this.resetTokens();
                // close.click();
            });
            const form = tag('form', { class: 'config-form' }, [wrap, tag('div', {class: 'buttons'}, [reset, save])]);
            const wrapper = tag('div', { class: 'config-wrapper' }, [title, form]);
            const overlay = tag('div', { class: 'config-overlay' }, [close, wrapper]);
            this.htmlElement.appendChild(overlay);
        });
        this.htmlElement.appendChild(showConfig);
    }

    editField(name, value) {
        let field = null;
        let behavior = true;
        if (isColor(value)) {
            field = tag('input', { id: name, name, value, type: 'color' });
        }
        else if (field = this.sizeField(name, value)) {
            behavior = false;
        } else {
            field = tag('input', { id: name, name, value, type: 'text' });
        }
        if (behavior) {
            field.addEventListener('input', event => {
                const name = event.target.name;
                const value = event.target.value;
                // console.log('behavior', name, value)
                this.tokens[name] = value;
                this.dt.setTokens(this.tokens);
            });
        }
        return field;
    }

    sizeField(name, value) {
        if (!/^[\d.]+([a-z%]+)$/.test(value)) {
            return false;
        }
        const unit = value.replace(/[^a-z]/g, '');
        const num = value.replace(/[^0-9.]/g, '');
        const units = [
            "px", "em", "rem", "%", "vw", "vh", "vmin", 
            "vmax", "ch", "ex", "mm", "cm", "in", "pt", "pc"
        ];
        const opts = [];
        units.forEach(unitType => opts.push(tag('option', {value: unitType}, unitType)));
        const select = tag('select', { class: 'units', id: `${name}_unit` }, opts);
        select.value = unit;
        const input = tag('span', { class: 'number', contenteditable: 'true', 'data-step': '0.1', id: `${name}_number` }, num);

        input.addEventListener('keydown', event => {
            const elem = event.target;
            const key = event.key;
            const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', '.'];
            const isNumber = /^[0-9]$/.test(key);
            const isAllowedKey = allowedKeys.includes(key);
            if ((!isNumber && !isAllowedKey && !(event.ctrlKey || event.metaKey)) || (key === '.' && elem.innerText.includes('.'))) {
                event.preventDefault();
                return;
            }
            if (key === 'ArrowUp' || key === 'ArrowDown') {
                event.preventDefault();
                const inc = Number(elem.dataset.step || 1);
                const val = parseFloat(elem.innerText) || 0;
                const decimals = (elem.dataset.step?.toString().split('.')[1]?.length || 0);
                
                elem.innerText = (key === 'ArrowUp' ? val + inc : val - inc).toFixed(decimals);
                elem.dispatchEvent(new Event('input'));
            }
        });
        
        const fn = () => {
            console.log('FN')
            hidden.value = input.innerText + select.value;
            this.tokens[hidden.name] = hidden.value;
            this.dt.setTokens(this.tokens);
        };
        const hidden = tag('input', { type: 'hidden', step: 'any', id: name, name, value });
        select.addEventListener('input', fn);
        input.addEventListener('input', fn);
        return tag('div', { class: 'size-field input' }, [input, select, hidden]);
    }
}

export default LayoutEditor;