import EditJSON from './edit-json.js';
import { loadCss, copyObject, isPlainObject } from './util.js';

/**
 * Auto load CSS files
 * -------------------
 * 
 * These URLs are relative to the location
 * of the page where this file is included.
 * Adjust it for your case or use absolute paths.
 * 
 * You can comment this line and use other way to include these files.
 * Both are required.
 */
loadCss(['css/edit-json.css', 'css/popup.css']);

/**
 * Using JSON Schemas with EditJSON loader
 * --------------------------------------
 * 
 * To use JSON schemas with this loader, define `window.EditJSONSchemas` 
 * with your named schemas before including this file.
 * The schema names (keys) must match the `data-schema` attribute used in your elements.
 *
 * Example:
 * 
 *     <script>
 *         window.EditJSONSchemas = {
 *             users: { ... }, // schema for textarea[data-schema="users"]
 *             layout: { ... } // schema for textarea[data-schema="layout"]
 *         };
 *     </script>
 *     <script type="module" src="js/apply-edit-json.js"></script>
 *
 * Use the schema name in the `data-schema` attribute:
 * 
 *     <textarea data-json-editor data-schema="users">{"json": "here"}</textarea>
 * 
 *     <button data-json-editor data-target-selector="#layout-items" data-schema="layout">
 *         Edit layout items
 *     </button>
 *     <textarea id="layout-items" readonly>{"json": "here"}</textarea>
 */
window.addEventListener('DOMContentLoaded', () => {
    if (window.EditJSONSchemas && isPlainObject(EditJSONSchemas)) {
        for (const schema in EditJSONSchemas) {
            EditJSON.schemas[schema] = copyObject(EditJSONSchemas[schema]);
        }
    }
    EditJSON.apply();
});