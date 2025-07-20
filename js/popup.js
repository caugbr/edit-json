// import '../css/popup.css';
import { $single, tag } from './util.js';

/**
 * Classe Popup
 *
 * Responsável por criar e controlar janelas modais (popups) com suporte a título, conteúdo,
 * botão de fechar, cabeçalho, rodapé e eventos customizados.
 *
 * Recursos principais:
 * - Exibe popups com título, conteúdo e elementos adicionais (top bar, footer, botões).
 * - Permite reagir a eventos como `open`, `close`, `beforeClose`, `scrollbarChange`.
 * - Suporte a personalização via classes CSS (`customClass`).
 * - Gerencia internamente a presença de scrollbar e adiciona a classe `has-scrollbar` quando necessário.
 *
 * Métodos importantes:
 * - `open()`: Exibe o popup.
 * - `close()`: Fecha o popup com delay e dispara eventos.
 * - `setTitle(title)`: Altera o título do popup.
 * - `setContent(content)`: Altera o conteúdo principal do popup.
 * - `setTopBar(content, clear)`: Define o conteúdo da barra superior no header.
 * - `setFooter(content, clear)`: Define o conteúdo do rodapé.
 * - `addFooterButton(btn)`: Adiciona um botão ao rodapé.
 * - `removeFooterButton(selector)`: Remove botão específico do rodapé.
 * - `on(event, callback)`: Escuta eventos internos.
 * - `action(event, ...params)`: Dispara eventos definidos via `on`.

 * Exemplo básico de uso:
 *
 * const popup = new Popup('Aviso', '<p>Você tem certeza que deseja sair?</p>');
 *
 * popup.on('open', () => console.log('Popup aberto'));
 * popup.on('close', (copiedContent) => console.log('Fechado:', copiedContent));
 *
 * const confirmBtn = document.createElement('button');
 * confirmBtn.textContent = 'Confirmar';
 * confirmBtn.onclick = () => popup.close();
 * popup.addFooterButton(confirmBtn);
 *
 * popup.open();
 *
 * Dependências externas:
 * - Funções auxiliares: `tag()` e `$single()` devem estar definidas no escopo global.
 * - Espera-se que a estrutura de estilos e animações (como `open-popup`, `popup-overlay`, etc.)
 *   seja definida no CSS do projeto.
 */

class Popup {
    title;
    content;
    events = {};
    opened = false;
    elementHasScrollbar = false;
    customClass = '';
    useCloseButton = true;
    useMaxMinButton = true;
    header = true;
    footer = true;
    footerChildren = [];
    stage = null;

    constructor(title = '', content = '') {
        this.title = title;
        this.content = content;

        this.on('open', () => this.opened = true);
        this.on('close', () => this.opened = false);

        this.on('scrollbarChange', visible => {
            const popup = $single('.popup-popup');
            popup.classList[visible ? 'add' : 'remove']('has-scrollbar');
        });

        window.addEventListener('resize', event => {
            const last = this.elementHasScrollbar;
            const cur = this.hasScrollbar();
            if (!last && cur) {
                this.action('scrollbarChange', true);
            }
            if (last && !cur) {
                this.action('scrollbarChange', false);
            }
        });
    }

    waiting(show = true) {
        const overlay = $single('.popup-overlay');
        overlay.classList[show ? 'add' : 'remove']('inner-overlay-open');
    }

    setTitle(title) {
        this.title = title;
        if (this.opened) {
            const titleBar = $single('.popup-popup header h2');
            this.add(titleBar, this.title);
        }
    }

    setContent(content) {
        this.content = content;
        if (this.opened) {
            const main = $single('.popup-popup article');
            this.add(main, this.content);
        }
    }

    open() {
        const overlay = tag('div', { class: 'popup-overlay' });
        const popup = tag('div', { class: 'popup-popup' });
        overlay.appendChild(popup);

        if (this.customClass) {
            const classes = this.customClass.split(/\s+/);
            classes.forEach(cls => overlay.classList.add(cls));
        }

        if (this.header) {
            const header = tag('header');
            popup.appendChild(header);
            if (this.title) {
                header.innerHTML = `<h2>${this.title}</h2>`;
            } else {
                header.classList.add('no-title');
            }

            const topBar = tag('div', { class: 'top-bar' });
            header.appendChild(topBar);

            if (this.useMaxMinButton) {
                const maximize = tag('a', { href: '#', class: 'maximize-popup' }, '<i class="fas fa-window-maximize"></i>');
                header.appendChild(maximize);
                maximize.addEventListener('click', event => {
                    event.preventDefault();
                    this.maximize();
                });
                const minimize = tag('a', { href: '#', class: 'minimize-popup' }, '<i class="fas fa-window-restore"></i>');
                header.appendChild(minimize);
                minimize.addEventListener('click', event => {
                    event.preventDefault();
                    this.minimize();
                });
            }

            if (this.useCloseButton) {
                const close = tag('a', { href: '#', class: 'close-popup' }, '<i class="fas fa-times"></i>');
                header.appendChild(close);
                close.addEventListener('click', event => {
                    event.preventDefault();
                    this.close();
                });
            }
        }


        const article = tag('article', {}, this.content);
        popup.appendChild(article);
        this.stage = article;

        if (this.footer) {
            const footer = tag('footer');
            popup.appendChild(footer);

            const ioverlay = tag('div', { class: 'inner-overlay' });
            popup.appendChild(ioverlay);

            const footerBar = tag('div', { class: 'footer-bar' });
            const footerButtons = tag('div', { class: 'footer-buttons' });
            footer.appendChild(footerBar);
            footer.appendChild(footerButtons);

            if (this.footerChildren.length) {
                for (let i = 0; i < this.footerChildren.length; i++) {
                    footerButtons.appendChild(this.footerChildren[i]);
                }
            }
        }

        document.body.appendChild(overlay);
        setTimeout(() => {
            document.body.classList.add('open-popup');
            this.action('open');
        }, 90);

    }

    maximize() {
        const div = $single('.popup-overlay .popup-popup');
        div.classList.add('max');
    }

    minimize() {
        const div = $single('.popup-overlay .popup-popup');
        div.classList.remove('max');
    }

    hasScrollbar() {
        const div = $single('.popup-overlay .popup-popup');
        return this.elementHasScrollbar = div ? (div.scrollHeight > div.clientHeight) : false;
    }

    on(evName, callback) {
        if (!this.events[evName]) {
            this.events[evName] = [];
        }
        this.events[evName].push(callback);
    }

    action(event, ...params) {
        if (this.events[event] !== undefined) {
            params.push(this);
            this.events[event].forEach(fnc => {
                fnc(...params);
            })
        }
    }

    close() {
        this.action('beforeClose');
        document.body.classList.remove('open-popup');
        setTimeout(() => {
            const overlay = $single('.popup-overlay');
            if (overlay) {
                const content = $single('.popup-popup article').cloneNode(true);
                overlay.parentElement.removeChild(overlay);
                this.action('close', content);
            }
        }, 1000);
    }

    setTopBar(content, clear = true) {
        if (!this.opened) {
            this.on('open', () => this.setTopBar(content, clear));
            return;
        }
        const bar = $single('.popup-popup .top-bar');
        this.add(bar, content, clear);
    }

    setFooter(content, clear = true) {
        const footer = $single('.popup-popup .footer-bar');
        this.add(footer, content, clear);
    }

    addFooterButton(btn) {
        const footerButtons = $single('.popup-popup .footer-buttons');
        if (footerButtons) {
            footerButtons.appendChild(btn);
        } else {
            this.footerChildren.push(btn);
        }
    }

    removeFooterButton(selector) {
        const btn = $single('.popup-popup .footer-buttons ' + selector);
        if (btn) {
            btn.parentNode.removeChild(btn);
        }
    }

    add(elem, content, clear = true) {
        if (clear) {
            elem.innerHTML = '';
        }
        if (typeof content == 'string') {
            elem.innerHTML += content;
        } else {
            elem.appendChild(content);
        }
    }
}

export default Popup;