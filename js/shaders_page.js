import { initI18n } from "./i18n.js";
import { initShaders } from './shaders.js';

document.addEventListener('DOMContentLoaded', () => {
    initI18n();
    initShaders();
});
