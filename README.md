# EditJSON

**EditJSON** is a minimal JS module that allows users to visually edit JSON through a popup. Ideal for admin panels and settings forms where raw JSON needs to be user-editable.

## Highlights

-   Edits both objects and arrays
-   Add, remove, and reorder items
-   Smart input types (boolean, date, number, etc.)
-   Collapsible nested objects
-   Simple setup, no dependencies
    

## Usage

Add this to your HTML:

```html
<script type="module" src="js/apply-edit-json.js"></script>
```

This script will:

-   Load the required CSS (`edit-json.css`, `popup.css`)
-   Attach the editor to elements with `data-json-editor`
    

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

You can disable the ability to move or remove items globally:

```js
EditJSON.canMoveItems = false;
EditJSON.canRemoveItems = false;
```

This disables the up/down arrows and remove buttons from the editor UI.

### Change Texts or Icons

All interface labels and icons are stored in `EditJSON.strings`. You can replace them using the `setStrings()` method:

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

No need for Font Awesome unless you want to use it. All visual elements are fully customizable via strings.

## License

MIT — © Cau Guanabara
