
/**
 * Classe para edição interativa de JSON em uma interface popup
 * @class
 */
class EditJSON {
    /** @type {string} Identificador único do editor */
    id = '';
    /** @type {string} Texto JSON original */
    jsonText = '';
    /** @type {Object|Array|null} Dados JSON parseados */
    jsonData = null;
    /** @type {HTMLElement|null} Elemento de texto contendo o JSON */
    jsonElement = null;
    /** @type {HTMLElement|null} Elemento HTML do editor */
    htmlElement = null;
    /** @type {Popup|null} Instância do popup */
    popup = null;

    /**
     * Cria uma instância do editor JSON
     * @constructor
     * @param {HTMLElement|null} jsonElement - Elemento de entrada/saída do JSON
     */
    constructor(jsonElement = null) {
        if (jsonElement) {
            this.set(jsonElement);
        }
        if (!window.ejRemoveEventSet) {
            window.ejRemoveEventSet = true;
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
        }
    }

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

    upItem(elem) {
        this.moveItem(elem, 'up');
    }

    downItem(elem) {
        this.moveItem(elem, 'down');
    }

    /**
     * Aplica o editor a todos os elementos correspondentes ao seletor
     * @static
     * @param {string} [selector='[data-json-editor]'] - Seletor CSS dos elementos ativadores
     */
    static apply(selector = '[data-json-editor]') {
        $apply(selector, el => {
            const targetSelector = el.dataset.targetSelector;
            const jsonEl = targetSelector ? document.querySelector(targetSelector) : el;

            if (!jsonEl) {
                console.warn(`Elemento alvo #${targetSelector} não encontrado.`);
                return;
            }

            if (!targetSelector) {
                el.setAttribute('readonly', true);
            }

            el.addEventListener('click', () => {
                const editor = new EditJSON(jsonEl);
                editor.openEditor();
            });
        });
    }

    /**
     * Configura o elemento JSON a ser editado
     * @param {HTMLElement} jsonElement - Elemento contendo o JSON
     * @returns {boolean} True se o JSON foi parseado com sucesso
     */
    set(jsonElement) {
        this.jsonElement = jsonElement;
        this.id = jsonElement.id || jsonElement.name || 'unnamed';
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
            console.error('JSON inválido:', e);
            return false;
        }
    }

    /**
     * Cria o elemento HTML do editor
     */
    makeHtml() {
        const existent = document.getElementById(`__ej_${this.id}`);
        if (existent) {
            this.htmlElement = existent;
            return;
        }
        this.htmlElement = tag('div', {
            id: `__ej_${this.id}`,
            class: 'edit-json',
            style: 'display: none;'
        });
        document.body.appendChild(this.htmlElement);
    }

    /**
     * Inicia a edição do JSON
     * @returns {boolean} False se não houver dados para editar
     */
    edit() {
        if (!this.jsonData) {
            console.error('JSON is not set.');
            return false;
        }

        let elem;
        if (this.getType(this.jsonData) === 'array') {
            elem = this.editArray(this.jsonData);
        } else {
            elem = this.editObject(this.jsonData);
        }

        this.htmlElement.appendChild(elem);
    }

    /**
     * Abre o editor em um popup
     */
    openEditor() {
        if (this.htmlElement.innerHTML.trim() === '') {
            this.edit();
        }
        this.popup = new Popup('Edit JSON', this.htmlElement);
        this.htmlElement.style.display = 'block';
        const okButton = tag('button', { type: 'button', class: 'save-json' }, 'Save');
        okButton.addEventListener('click', () => {
            const json = this.extractFromHtml();
            this.jsonElement.value = JSON.stringify(json, null, 4);
            this.popup.close();
        });
        this.popup.addFooterButton(okButton);
        this.popup.open();
    }

    /**
     * Cria um campo editável para um par chave-valor
     * @param {string} key - Nome da propriedade
     * @param {*} val - Valor da propriedade
     * @returns {HTMLElement} Elemento DIV contendo o campo editável
     */
    editField(key, val) {
        const keyText = tag('span', { contenteditable: true, spellcheck: false, class: 'edit-key' }, key);
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
        return tag('div', {class: 'edit-line'}, [ keyText, ": ", valText ]);
    }

    /**
     * Cria o HTML apropriado para o valor com base em seu tipo
     * @param {*} val - Valor a ser renderizado
     * @returns {HTMLElement} Elemento contendo o controle de edição
     */
    valHtml(val, actions = true) {
        let valText;
        switch (this.getType(val)) {
            case 'boolean':
                const yes = { value: 'true' };
                if (true === val) yes.selected = true;
                const no = { value: 'false' };
                if (false === val) no.selected = true;
                valText = tag('select', { class: 'edit-value' }, [
                    tag('option', yes, 'true'),
                    tag('option', no, 'false')
                ]);
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
                valText = tag('input', { type: 'number', value: val, class: 'edit-value-number-input' });
                break;
            default:
                const dateType = this.isDateTime(val);
                if (dateType) {
                    const txt = tag('span', { contenteditable: true, class: 'edit-value' }, val);
                    const inp = tag('input', { type: dateType, value: val, class: 'edit-value-date-input' });
                    const line = tag('span', { class: 'edit-value-date' }, [ txt, inp ]);
                    txt.addEventListener('focus', () => line.classList.add('focused'));
                    txt.addEventListener('blur', () => line.classList.remove('focused'));
                    txt.addEventListener('input', () => inp.value = txt.innerText);
                    inp.addEventListener('focus', () => line.classList.add('focused'));
                    inp.addEventListener('blur', () => line.classList.remove('focused'));
                    inp.addEventListener('input', () => txt.innerText = inp.value);
                    valText = line;
                } else {
                    valText = tag('span', { contenteditable: true, class: 'edit-value' }, val);
                }
        }
        if (actions) {
            return tag('span', { class: 'input-wrapper' }, [valText, this.makeActions()]);
        }
        return tag('span', { class: 'input-wrapper' }, valText);
    }

    makeActions() {
        const removeButton = tag('a', { href: '#', class: 'remove-item skip' }, '&times;');
        const upButton = tag('a', { href: '#', class: 'up-item skip' }, '<i class="fas fa-caret-up"></i>');
        const downButton = tag('a', { href: '#', class: 'down-item skip' }, '<i class="fas fa-caret-down"></i>');
        return tag('div', { class: 'actions skip' }, [removeButton, upButton, downButton]);
    }

    /**
     * Cria interface para edição de array
     * @param {Array} arr - Array a ser editado
     * @returns {HTMLElement} Elemento SPAN contendo os itens do array
     */
    editArray(arr) {
        const items = [];
        arr.forEach(item => {
            items.push(this.valHtml(item));
        });
        items.push(this.newArrayItem());
        items.push(this.makeActions());
        const editor = tag('span', { class: 'edit-array' }, items);
        return tag('span', { class: 'edit-array-wrapper' }, [ ...this.toggleLinks(), editor ]);
    }

    /**
     * Cria interface para adição de novo item em array
     * @returns {HTMLElement} Elemento DIV com controles de adição
     */
    newArrayItem() {
        const valField = tag('select', { class: 'value' }, [
            tag('option', { value: '', selected: true, disabled: true }, 'Select type'),
            tag('option', { value: 'string' }, 'string'),
            tag('option', { value: 'number' }, 'number'),
            tag('option', { value: 'boolean' }, 'boolean'),
            tag('option', { value: 'array' }, 'array'),
            tag('option', { value: 'object' }, 'object')
        ]);
        valField.addEventListener('input', event => {
            this.enableAddButton(event.target);
        });
        const addButton = tag('button', { type: 'button', disabled: true }, 'Add');
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item skip' }, [ valField, addButton ]);
    }

    /**
     * Cria interface para edição de objeto
     * @param {Object} obj - Objeto a ser editado
     * @returns {HTMLElement} Elemento SPAN contendo os campos do objeto
     */
    editObject(obj) {
        const lines = [];
        for (const key in obj) {
            lines.push(this.editField(key, obj[key]));
        }
        lines.push(this.newObjectItem());
        lines.push(this.makeActions());
        const editor = tag('span', { class: 'edit-object' }, lines);
        return tag('span', { class: 'edit-object-wrapper' }, [ ...this.toggleLinks(), editor ]);
    }

    /**
     * Cria interface para adição de nova propriedade em objeto
     * @returns {HTMLElement} Elemento DIV com controles de adição
     */
    newObjectItem() {
        const keyField = tag('input', { type: 'text', class: 'key', placeholder: 'New key' });
        keyField.addEventListener('input', event => this.enableAddButton(event.target));
        const keyEl = tag('span', {}, ['"', keyField, '": ']);
        const valField = tag('select', { class: 'value' }, [
            tag('option', { value: '', selected: true, disabled: true }, 'Select type'),
            tag('option', { value: 'string' }, 'string'),
            tag('option', { value: 'number' }, 'number'),
            tag('option', { value: 'boolean' }, 'boolean'),
            tag('option', { value: 'array' }, 'array'),
            tag('option', { value: 'object' }, 'object')
        ]);
        valField.addEventListener('input', event => this.enableAddButton(event.target));
        const addButton = tag('button', { type: 'button', disabled: true }, 'Add');
        addButton.addEventListener('click', event => {
            this.addItem(event.target);
        });
        return tag('div', { class: 'add-obj-item skip' }, [ keyEl, valField, addButton ]);
    }

    toggleLinks() {
        const toggleUp = tag('a', { class: 'toggle up skip', href: '#' }, '<i class="fas fa-chevron-up"></i>');
        const toggleDown = tag('a', { class: 'toggle down skip', href: '#' }, '<i class="fas fa-chevron-down"></i>');
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

    toggleUp(elem) {
        const wrapper = elem.closest('.edit-object-wrapper,.edit-array-wrapper');
        wrapper.classList.add('collapsed');
    }

    toggleDown(elem) {
        const wrapper = elem.closest('.edit-object-wrapper,.edit-array-wrapper');
        wrapper.classList.remove('collapsed');
    }

    /**
     * Habilita/desabilita botão de adição com base na validade dos inputs
     * @param {HTMLElement} elem - Elemento que disparou o evento
     */
    enableAddButton(elem) {
        const div = elem.closest('div');
        const button = div.querySelector('button');
        let disabled = div.querySelector('select').value == '';
        const input = div.querySelector('input');
        if (input && !input.value) {
            disabled = true;
        }
        button.disabled = disabled;
    }

    /**
     * Adiciona novo item ao array/objeto
     * @param {HTMLElement} elem - Botão que disparou a ação
     */
    addItem(elem) {
        const iniVals = {
            string: '',
            number: 0,
            boolean: true,
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
            } else {
                console.error('The key is required.');
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
     * Remove um item do array/objeto com confirmação
     * @param {HTMLElement} elem - Elemento a ser removido
     * @returns {Promise<void>}
     */
    async removeItem(elem) {
        const confirmed = await new Promise(resolve =>
            setTimeout(() => resolve(confirm('Deseja remover?')), 0)
        );
        if (confirmed) {
            elem.closest('.edit-object > .edit-line, .edit-array > .input-wrapper')?.remove();
        }
    }

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
                    const valContainer = [...line.children].find(el => el !== keyEl && !el.matches('.skip'));
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
     * Determina o tipo de uma variável (melhorado para objetos/arrays)
     * @param {*} variable - Valor a ser verificado
     * @returns {string} Tipo do valor ('object', 'array', 'null', etc.)
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
     * Verifica se uma string representa uma data/hora
     * @param {string} val - Valor a ser testado
     * @returns {string|false} Tipo de data ('date', 'datetime-local', 'time') ou false
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
}
