// js/main.js
import { processAlbedo, generateNormalMap, generateRoughnessMap, generateAOMap, generateHeightMap } from './imageUtils.js';
import { exportMaterials, exportBatchMaterials } from './godotExporter.js';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileListUl = document.getElementById('fileListUl');

// Controls
const seamlessToggle = document.getElementById('seamlessToggle');
const normalStrength = document.getElementById('normalStrength');
const normalStrengthValue = document.getElementById('normalStrengthValue');
const roughnessStrength = document.getElementById('roughnessStrength');
const roughnessStrengthValue = document.getElementById('roughnessStrengthValue');
const aoStrength = document.getElementById('aoStrength');
const aoStrengthValue = document.getElementById('aoStrengthValue');
const heightStrength = document.getElementById('heightStrength');
const heightStrengthValue = document.getElementById('heightStrengthValue');
const materialNameInput = document.getElementById('materialName');
const tilingSelect = document.getElementById('tilingSelect');

// Previews
const albedoCanvas = document.getElementById('albedoCanvas');
const normalCanvas = document.getElementById('normalCanvas');
const roughnessCanvas = document.getElementById('roughnessCanvas');
const aoCanvas = document.getElementById('aoCanvas');
const heightCanvas = document.getElementById('heightCanvas');

const albedoPlaceholder = document.getElementById('albedoPlaceholder');
const normalPlaceholder = document.getElementById('normalPlaceholder');
const roughnessPlaceholder = document.getElementById('roughnessPlaceholder');
const aoPlaceholder = document.getElementById('aoPlaceholder');
const heightPlaceholder = document.getElementById('heightPlaceholder');

// Buttons
const btnDownloadZip = document.getElementById('btnDownloadZip');
const btnDownloadCurrentTres = document.getElementById('btnDownloadCurrentTres');

// State
let uploadedFiles = []; // Array of objects: { file, image, name }
let activeFileIndex = -1;

// Setup Event Listeners
function setupEventListeners() {
    // Dropzone events
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Control events
    seamlessToggle.addEventListener('change', updateTextures);
    tilingSelect.addEventListener('change', updateTextures);

    const bindSlider = (slider, valueDisplay) => {
        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
            if (activeFileIndex >= 0) updateTextures();
        });
    };

    bindSlider(normalStrength, normalStrengthValue);
    bindSlider(roughnessStrength, roughnessStrengthValue);
    bindSlider(aoStrength, aoStrengthValue);
    bindSlider(heightStrength, heightStrengthValue);

    // Export buttons
    btnDownloadZip.addEventListener('click', () => {
        const settings = getSettings();
        exportBatchMaterials(uploadedFiles, settings);
    });

    btnDownloadCurrentTres.addEventListener('click', () => {
        const activeItem = uploadedFiles[activeFileIndex];
        const baseName = materialNameInput.value.trim() || activeItem.name;
        exportMaterials(
            null, null, null, null, null, // Canvases are null, we export TRES only
            baseName,
            activeItem.name,
            true
        );
    });
}

function getSettings() {
    return {
        isSeamless: seamlessToggle.checked,
        normalStrength: parseFloat(normalStrength.value),
        roughnessStrength: parseFloat(roughnessStrength.value),
        aoStrength: parseFloat(aoStrength.value),
        heightStrength: parseFloat(heightStrength.value),
        baseName: materialNameInput.value.trim() || 'Material'
    };
}

// File Handling
function handleFiles(files) {
    let loadedCount = 0;
    const newUploads = [];

    Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;

        const fileName = file.name.replace(/\.[^/.]+$/, "");

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                newUploads.push({ file, image: img, name: fileName });
                loadedCount++;
                if (loadedCount === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
                    uploadedFiles.push(...newUploads);
                    updateFileList();
                    if (activeFileIndex === -1 && uploadedFiles.length > 0) {
                        setActiveFile(0);
                    }
                    enableButtons();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateFileList() {
    if (uploadedFiles.length > 0) {
        fileList.classList.remove('hidden');
    }

    fileListUl.innerHTML = '';
    uploadedFiles.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item.name;
        if (index === activeFileIndex) {
            li.classList.add('active');
        }
        li.addEventListener('click', () => setActiveFile(index));
        fileListUl.appendChild(li);
    });
}

function setActiveFile(index) {
    activeFileIndex = index;
    const item = uploadedFiles[index];
    materialNameInput.value = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    updateFileList();
    updateTextures();
}

function updateTextures() {
    if (activeFileIndex === -1) return;

    const item = uploadedFiles[activeFileIndex];
    const settings = getSettings();
    const tiling = parseInt(tilingSelect.value);

    // Update Albedo
    processAlbedo(item.image, albedoCanvas, settings.isSeamless, tiling);
    albedoCanvas.style.display = 'block';
    albedoPlaceholder.style.display = 'none';

    // We generate the other maps using the 1x Albedo map as source
    const sourceCanvas = document.createElement('canvas');
    processAlbedo(item.image, sourceCanvas, settings.isSeamless, 1);

    // Update Maps
    generateNormalMap(sourceCanvas, normalCanvas, settings.normalStrength, settings.isSeamless, tiling);
    normalCanvas.style.display = 'block';
    normalPlaceholder.style.display = 'none';

    generateRoughnessMap(sourceCanvas, roughnessCanvas, settings.roughnessStrength, settings.isSeamless, tiling);
    roughnessCanvas.style.display = 'block';
    roughnessPlaceholder.style.display = 'none';

    generateAOMap(sourceCanvas, aoCanvas, settings.aoStrength, settings.isSeamless, tiling);
    aoCanvas.style.display = 'block';
    aoPlaceholder.style.display = 'none';

    generateHeightMap(sourceCanvas, heightCanvas, settings.heightStrength, settings.isSeamless, tiling);
    heightCanvas.style.display = 'block';
    heightPlaceholder.style.display = 'none';
}

function enableButtons() {
    btnDownloadZip.disabled = false;
    btnDownloadCurrentTres.disabled = false;
}

// Initialize
setupEventListeners();
