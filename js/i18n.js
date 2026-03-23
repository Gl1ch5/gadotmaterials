const translations = {
    en: {
        "nav-materials": "Materials",
        "nav-decals": "Decals",
        "nav-foliage": "Foliage",
        "nav-particles": "Particles",
        "nav-shaders": "Shaders",
        "subtitle": "Create Godot materials instantly.",
        "download-zip": "Download All as ZIP (Textures + .tres)",
        "download-tres": "Download Current .tres only"
    },
    ru: {
        "nav-materials": "Материалы",
        "nav-decals": "Декали",
        "nav-foliage": "Растительность",
        "nav-particles": "Частицы",
        "nav-shaders": "Шейдеры",
        "subtitle": "Мгновенно создавайте материалы для Godot.",
        "download-zip": "Скачать всё как ZIP (Текстуры + .tres)",
        "download-tres": "Скачать только текущий .tres"
    }
};

export function initI18n() {
    const langSelect = document.getElementById('langSelect');
    if (!langSelect) return;

    // Load saved lang
    const savedLang = localStorage.getItem('appLang') || 'en';
    langSelect.value = savedLang;
    applyLang(savedLang);

    langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        localStorage.setItem('appLang', lang);
        applyLang(lang);
    });
}

function applyLang(lang) {
    const dict = translations[lang];
    if (!dict) return;

    // Translate standard elements via data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });
}
