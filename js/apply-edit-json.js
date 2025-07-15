import EditJSON from './edit-json.js';
import { loadCss } from './util.js';

// These URLs are relative to the location
// of the page where this file is included.
// Or they must be absolute paths.
loadCss(['css/edit-json.css', 'css/popup.css']);

window.addEventListener('DOMContentLoaded', () => {
    // EditJSON.canMoveItems = false;
    // EditJSON.canRemoveItems = false;
    EditJSON.apply();
});