# EditJSON

**EditJSON** is a lightweight JavaScript module that provides a visual JSON editing interface via popup. Designed for admin panels and configuration forms, it enables safe modification of JSON data without requiring technical expertise.

## Highlights

-   **Dynamic item manipulation**: Add, remove, and reorder items
-   **Type-Smart Inputs**: Automatic input selection for each data type (boolean, number, string)
-   **Date/Time Helpers**: Built-in `date`/`time`/`datetime-local` inputs for temporal values
-   **Color Picker**: Integrated `color` input for hex values
-   **Zero Dependencies**: Lightweight vanilla JS implementation

## Usage

### Automatic Initialization

For all elements with `[data-json-editor]` attribute:

```html
<script type="module" src="js/apply-edit-json.js"></script>
```

This loader script will:

-   Load the required CSS (`edit-json.css`, `popup.css`)
-   Attach the editor to all elements with `data-json-editor`

### Manual Initialization

For custom implementation:

```html
<script type="module">
    import EditJSON from 'edit-json/js/edit-json.js';

    window.addEventListener('DOMContentLoaded', () => {
        // Load for elements with the attribute [data-json-editor] set
        EditJSON.apply();
        
        // Load for a single element without the attribute
        const jsonEl = document.getElementById('json_textarea');
        jsonEl.setAttribute('readonly', true);
        jsonEl.addEventListener('click', () => {
            const editor = new EditJSON(jsonEl);
            editor.openEditor();
        });

        // Using a button to open the editor
        const editor = new EditJSON(document.getElementById('json-textarea'));
        document.getElementById('edit-btn').addEventListener('click', () => {
            editor.openEditor();
        });
    });
</script>
```

### Basic Example

```html
<textarea data-json-editor rows="6" cols="60">
{
    "active": true,
    "tags": ["example", "demo"]
}
</textarea>
```

### Trigger Another Element

You can use a separate trigger (like a button) and target the JSON field using `data-target-selector`.

```html
<textarea id="myJson" readonly rows="6" cols="60">
{
    "title": "My config",
    "enabled": false
}
</textarea>

<button data-json-editor data-target-selector="#myJson">Edit JSON</button>
```

The button will open the popup editor for the `<textarea>`, even though it’s read-only.

## Customization

EditJSON provides simple ways to change behavior and appearance.

### Disable Controls

You can disable the ability to insert, move or remove items, separatedly. Besides that, you can block the edition of object keys.

```js
EditJSON.canInsertItems = false; // Disables the insertion of new items in arrays/objects
EditJSON.canMoveItems = false; // Locks item positions in arrays/objects
EditJSON.canEditKeys = false; // Prevents modification of object property names
EditJSON.canRemoveItems = false;  // Removes item deletion capabilities
```

This disables the up/down arrows and remove buttons from the editor UI.

### Change Texts or Icons

All interface labels and icons are stored in `EditJSON.strings`. You can replace them using the `setStrings()` method.

```js
EditJSON.setStrings({
    popupTitle: 'Editar JSON',
    popupOkButtonLabel: 'Salvar',
    popupCancelButtonLabel: 'Cancelar',
    moveUpIcon: '⬆️',
    moveDownIcon: '⬇️',
    removeIcon: '❌'
});
```
Place this before calling `EditJSON.apply()` — or directly inside `apply-edit-json.js` if you're using the default loader.

This also allows you to:

-   Translate all UI strings
-   Replace Font Awesome icons with emojis, plain text, or your own HTML
-   Simplify the UI by removing icons (e.g. `removeIcon: ''`)

No need for Font Awesome unless you want to use it. All visual elements (including the Font Awesome icons) are fully customizable via strings. To do this you must replace all icons (`moveUpIcon`, `moveDownIcon`, `removeIcon`, `collapseItemIcon` e `expandItemIcon`).

## Screenshots
The editor
![The editor](./screenshots/json-editor.png)

Item action links
![Item action links](./screenshots/json-editor-actions.png)

Editing a boolean value
![Editing a boolean value](./screenshots/json-editor-boolean.png)

Editing a string in date format
![Editing a string in date format](./screenshots/json-editor-date.png)

Duplicated object key
![Duplicated object key](./screenshots/json-editor-invalid.png)

## License

MIT — © Cau Guanabara
