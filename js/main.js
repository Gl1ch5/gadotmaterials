// js/main.js
import { processAlbedo, generateNormalMap } from './imageUtils.js';
import { exportMaterials } from './godotExporter.js';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

// Controls
const seamlessToggle = document.getElementById('seamlessToggle');
const normalStrength = document.getElementById('normalStrength');
const normalStrengthValue = document.getElementById('normalStrengthValue');
const materialNameInput = document.getElementById('materialName');

// Previews
const albedoCanvas = document.getElementById('albedoCanvas');
const normalCanvas = document.getElementById('normalCanvas');
const albedoPlaceholder = document.getElementById('albedoPlaceholder');
const normalPlaceholder = document.getElementById('normalPlaceholder');

// Buttons
const btnDownloadZip = document.getElementById('btnDownloadZip');
const btnDownloadAlbedo = document.getElementById('btnDownloadAlbedo');
const btnDownloadNormal = document.getElementById('btnDownloadNormal');
const btnDownloadTres = document.getElementById('btnDownloadTres');

// State
let originalImage = null;
let currentFileName = 'texture';

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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Control events
    seamlessToggle.addEventListener('change', updateTextures);

    normalStrength.addEventListener('input', (e) => {
        normalStrengthValue.textContent = e.target.value;
        if (originalImage) {
            updateTextures(); // Real-time update
        }
    });

    // Export buttons
    btnDownloadAlbedo.addEventListener('click', () => downloadCanvas(albedoCanvas, `${currentFileName}_albedo.png`));
    btnDownloadNormal.addEventListener('click', () => downloadCanvas(normalCanvas, `${currentFileName}_normal.png`));

    btnDownloadZip.addEventListener('click', () => {
        exportMaterials(
            albedoCanvas,
            normalCanvas,
            materialNameInput.value.trim() || 'Material',
            currentFileName
        );
    });

    btnDownloadTres.addEventListener('click', () => {
        // Just export a tres assuming textures exist nearby
        exportMaterials(null, null, materialNameInput.value.trim() || 'Material', currentFileName, true);
    });
}

// File Handling
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    // Extract name without extension
    currentFileName = file.name.replace(/\.[^/.]+$/, "");
    materialNameInput.value = currentFileName.charAt(0).toUpperCase() + currentFileName.slice(1);

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            updateTextures();
            enableButtons();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateTextures() {
    if (!originalImage) return;

    const isSeamless = seamlessToggle.checked;
    const strength = parseFloat(normalStrength.value);

    // Update Albedo
    processAlbedo(originalImage, albedoCanvas, isSeamless);
    albedoCanvas.style.display = 'block';
    albedoPlaceholder.style.display = 'none';

    // Update Normal
    generateNormalMap(albedoCanvas, normalCanvas, strength, isSeamless);
    normalCanvas.style.display = 'block';
    normalPlaceholder.style.display = 'none';
}

function enableButtons() {
    btnDownloadZip.disabled = false;
    btnDownloadAlbedo.disabled = false;
    btnDownloadNormal.disabled = false;
    btnDownloadTres.disabled = false;
}

function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Initialize
setupEventListeners();
