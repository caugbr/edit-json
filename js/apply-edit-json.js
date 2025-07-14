import EditJSON from './edit-json.js';
import { loadCss } from './util.js';

loadCss(['css/edit-json.css', 'css/popup.css'])

window.addEventListener('DOMContentLoaded', () => {
    // EditJSON.canMoveItems = false;
    // EditJSON.canRemoveItems = false;
    EditJSON.apply();
});