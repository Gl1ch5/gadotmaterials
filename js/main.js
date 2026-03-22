// js/main.js
import { processAlbedo, generateNormalMap, generateRoughnessMap, generateAOMap, generateHeightMap, generateMetallicMap } from './imageUtils.js';
import { exportMaterials, exportBatchMaterials } from './godotExporter.js';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileListUl = document.getElementById('fileListUl');

// Controls
const seamlessToggle = document.getElementById('seamlessToggle');
const seamlessAlgorithm = document.getElementById('seamlessAlgorithm');
const removeBgToggle = document.getElementById('removeBgToggle');
const removeBgMode = document.getElementById('removeBgMode');
const removeBgTolerance = document.getElementById('removeBgTolerance');
const removeBgToleranceValue = document.getElementById('removeBgToleranceValue');
const normalStrength = document.getElementById('normalStrength');
const normalStrengthValue = document.getElementById('normalStrengthValue');
const roughnessStrength = document.getElementById('roughnessStrength');
const roughnessStrengthValue = document.getElementById('roughnessStrengthValue');
const aoStrength = document.getElementById('aoStrength');
const aoStrengthValue = document.getElementById('aoStrengthValue');
const heightStrength = document.getElementById('heightStrength');
const heightStrengthValue = document.getElementById('heightStrengthValue');
const metallicStrength = document.getElementById('metallicStrength');
const metallicStrengthValue = document.getElementById('metallicStrengthValue');
const materialNameInput = document.getElementById('materialName');
const btnApplyName = document.getElementById('btnApplyName');
const tilingSelect = document.getElementById('tilingSelect');
const btnAITune = document.getElementById('btnAITune');
const aiDescription = document.getElementById('aiDescription');

// Toggles
const toggleNormal = document.getElementById('toggleNormal');
const toggleRoughness = document.getElementById('toggleRoughness');
const toggleAO = document.getElementById('toggleAO');
const toggleHeight = document.getElementById('toggleHeight');
const toggleMetallic = document.getElementById('toggleMetallic');

// Previews
const albedoCanvas = document.getElementById('albedoCanvas');
const normalCanvas = document.getElementById('normalCanvas');
const roughnessCanvas = document.getElementById('roughnessCanvas');
const aoCanvas = document.getElementById('aoCanvas');
const heightCanvas = document.getElementById('heightCanvas');
const metallicCanvas = document.getElementById('metallicCanvas');

const albedoPlaceholder = document.getElementById('albedoPlaceholder');
const normalPlaceholder = document.getElementById('normalPlaceholder');
const roughnessPlaceholder = document.getElementById('roughnessPlaceholder');
const aoPlaceholder = document.getElementById('aoPlaceholder');
const heightPlaceholder = document.getElementById('heightPlaceholder');
const metallicPlaceholder = document.getElementById('metallicPlaceholder');

// Buttons
const btnDownloadZip = document.getElementById('btnDownloadZip');
const btnDownloadCurrentTres = document.getElementById('btnDownloadCurrentTres');

// State
let uploadedFiles = []; // Array of objects: { file, image, name }
let activeFileIndex = -1;

// Tabs Logic
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });
}
setupTabs();

import { init3DViewer, update3DMaterial } from './preview3d.js';
import { initParticles } from './particles.js';
import { initShaders } from './shaders.js';

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
    seamlessAlgorithm.addEventListener('change', updateTextures);
    removeBgToggle.addEventListener('change', updateTextures);
    removeBgMode.addEventListener('change', updateTextures);
    removeBgTolerance.addEventListener('input', () => {
        removeBgToleranceValue.textContent = removeBgTolerance.value;
        updateTextures();
    });
    tilingSelect.addEventListener('change', updateTextures);

    // Apply Name logic
    btnApplyName.addEventListener('click', () => {
        if (uploadedFiles.length === 0) return;

        // Add animation
        btnApplyName.classList.remove('btn-anim-secondary');
        void btnApplyName.offsetWidth; // trigger reflow
        btnApplyName.classList.add('btn-anim-secondary');

        const baseName = materialNameInput.value.trim() || 'Material';

        if (uploadedFiles.length === 1) {
            uploadedFiles[0].name = baseName;
        } else {
            uploadedFiles.forEach((item, idx) => {
                item.name = `${baseName}${idx + 1}`;
            });
        }

        updateFileList();
    });

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
    bindSlider(metallicStrength, metallicStrengthValue);

    // Bind Toggles
    const toggles = [toggleNormal, toggleRoughness, toggleAO, toggleHeight, toggleMetallic];
    toggles.forEach(t => t.addEventListener('change', () => {
        if (activeFileIndex >= 0) updateTextures();
    }));

    // Export buttons
    btnDownloadZip.addEventListener('click', () => {
        btnDownloadZip.classList.remove('btn-anim-primary');
        void btnDownloadZip.offsetWidth;
        btnDownloadZip.classList.add('btn-anim-primary');

        const settings = getSettings();
        exportBatchMaterials(uploadedFiles, settings);
    });

    btnDownloadCurrentTres.addEventListener('click', () => {
        btnDownloadCurrentTres.classList.remove('btn-anim-secondary');
        void btnDownloadCurrentTres.offsetWidth;
        btnDownloadCurrentTres.classList.add('btn-anim-secondary');

        const activeItem = uploadedFiles[activeFileIndex];
        const matName = activeItem.name;

        // Pass dummy empty objects or nulls, godotExporter only checks truthiness to omit logic for UI vs batch
        const s = getSettings();
        exportMaterials(
            null, null, null, null, null, null,
            matName, activeItem.name, true, s
        );
    });

    // AI Logic
    btnAITune.addEventListener('click', async () => {
        const desc = aiDescription.value.trim();
        const apiKey = localStorage.getItem('groqApiKey');

        if (!apiKey) {
            alert("Please configure your Groq API key in the settings first.");
            return;
        }

        if (!desc) {
            alert("Please enter a material description first.");
            return;
        }

        btnAITune.disabled = true;
        const originalText = btnAITune.innerHTML;
        btnAITune.innerHTML = "Thinking...";

        try {
            const prompt = `You are a PBR material expert configuring a Godot 4 material generator.
The user uploaded a texture described as: "${desc}".

Respond ONLY with a valid JSON object matching this schema. Do not wrap in markdown blocks, just the raw JSON:
{
  "normalStrength": float (0.0 to 5.0, e.g. 1.0 for flat, 4.0 for deep rock/sand),
  "roughnessStrength": float (0.1 to 3.0. Sand/rock ~1.5. Wood ~1.0),
  "aoStrength": float (0.0 to 3.0. Cracks/pebbles need more AO ~1.5-2.0),
  "heightStrength": float (0.0 to 2.0. Flat is 0.0, bumpy is 1.0+),
  "metallicStrength": float (0.0 to 3.0. If metal, 2.0-3.0. If non-metal, 0.0 or 0.1),
  "useNormal": boolean,
  "useRoughness": boolean,
  "useAO": boolean,
  "useHeight": boolean,
  "useMetallic": boolean,
  "seamlessAlgorithm": string (choose "offset", "crossfade", or "mirror")
}`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`API Request Failed: ${response.status} ${errorData}`);
            }

            const data = await response.json();
            let resultText = data.choices[0].message.content.trim();
            // Try to extract JSON if it was wrapped in markdown by mistake
            if (resultText.startsWith("```json")) {
                resultText = resultText.replace(/^```json/, "").replace(/```$/, "").trim();
            } else if (resultText.startsWith("```")) {
                resultText = resultText.replace(/^```/, "").replace(/```$/, "").trim();
            }
            const config = JSON.parse(resultText);

            // Apply config to UI
            normalStrength.value = config.normalStrength;
            normalStrengthValue.textContent = config.normalStrength;

            roughnessStrength.value = config.roughnessStrength;
            roughnessStrengthValue.textContent = config.roughnessStrength;

            aoStrength.value = config.aoStrength;
            aoStrengthValue.textContent = config.aoStrength;

            heightStrength.value = config.heightStrength;
            heightStrengthValue.textContent = config.heightStrength;

            metallicStrength.value = config.metallicStrength;
            metallicStrengthValue.textContent = config.metallicStrength;

            toggleNormal.checked = config.useNormal;
            toggleRoughness.checked = config.useRoughness;
            toggleAO.checked = config.useAO;
            toggleHeight.checked = config.useHeight;
            toggleMetallic.checked = config.useMetallic;

            if (config.seamlessAlgorithm) {
                seamlessAlgorithm.value = config.seamlessAlgorithm;
            }

            // Animate button
            btnAITune.classList.remove('btn-anim-secondary');
            void btnAITune.offsetWidth;
            btnAITune.classList.add('btn-anim-secondary');

            if (activeFileIndex >= 0) updateTextures();

        } catch (err) {
            console.error(err);
            alert("AI Error: Could not generate configuration. " + err.message);
        } finally {
            btnAITune.disabled = false;
            btnAITune.innerHTML = originalText;
        }
    });

    // Init 3D Viewer
    init3DViewer();
}

function getSettings() {
    return {
        isSeamless: seamlessToggle.checked,
        seamlessAlgorithm: seamlessAlgorithm.value,
        removeBg: removeBgToggle.checked,
        removeBgMode: removeBgMode.value,
        removeBgTolerance: parseInt(removeBgTolerance.value),
        normalStrength: parseFloat(normalStrength.value),
        roughnessStrength: parseFloat(roughnessStrength.value),
        aoStrength: parseFloat(aoStrength.value),
        heightStrength: parseFloat(heightStrength.value),
        metallicStrength: parseFloat(metallicStrength.value),
        useNormal: toggleNormal.checked,
        useRoughness: toggleRoughness.checked,
        useAO: toggleAO.checked,
        useHeight: toggleHeight.checked,
        useMetallic: toggleMetallic.checked,
        baseName: materialNameInput.value.trim() || 'Material'
    };
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    if (uploadedFiles.length === 0) {
        activeFileIndex = -1;
        albedoCanvas.style.display = 'none';
        normalCanvas.style.display = 'none';
        roughnessCanvas.style.display = 'none';
        aoCanvas.style.display = 'none';
        heightCanvas.style.display = 'none';
        metallicCanvas.style.display = 'none';

        albedoPlaceholder.style.display = 'block';
        normalPlaceholder.style.display = 'block';
        roughnessPlaceholder.style.display = 'block';
        aoPlaceholder.style.display = 'block';
        heightPlaceholder.style.display = 'block';
        metallicPlaceholder.style.display = 'block';

        fileList.classList.add('hidden');
        btnDownloadZip.disabled = true;
        btnDownloadCurrentTres.disabled = true;

        // Clear 3D
        update3DMaterial(null, null, null, null, null, null, null);
    } else {
        if (activeFileIndex >= uploadedFiles.length) {
            activeFileIndex = uploadedFiles.length - 1;
        } else if (activeFileIndex > index) {
            activeFileIndex--;
        }
        setActiveFile(activeFileIndex);
    }
    updateFileList();
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

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        li.appendChild(nameSpan);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '&times;';
        delBtn.className = 'delete-btn';
        delBtn.title = "Remove";
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent triggering row click
            removeFile(index);
        });
        li.appendChild(delBtn);

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
    processAlbedo(item.image, albedoCanvas, settings.isSeamless, tiling, settings.seamlessAlgorithm, settings.removeBg, settings.removeBgMode, settings.removeBgTolerance);
    albedoCanvas.style.display = 'block';
    albedoPlaceholder.style.display = 'none';

    // We generate the other maps using the 1x Albedo map as source
    const sourceCanvas = document.createElement('canvas');
    processAlbedo(item.image, sourceCanvas, settings.isSeamless, 1, settings.seamlessAlgorithm, settings.removeBg, settings.removeBgMode, settings.removeBgTolerance);

    // Update Maps conditionally based on toggles
    if (settings.useNormal) {
        generateNormalMap(sourceCanvas, normalCanvas, settings.normalStrength, settings.isSeamless, tiling);
        normalCanvas.style.display = 'block';
        normalPlaceholder.style.display = 'none';
    } else {
        normalCanvas.style.display = 'none';
        normalPlaceholder.style.display = 'block';
    }

    if (settings.useRoughness) {
        generateRoughnessMap(sourceCanvas, roughnessCanvas, settings.roughnessStrength, settings.isSeamless, tiling);
        roughnessCanvas.style.display = 'block';
        roughnessPlaceholder.style.display = 'none';
    } else {
        roughnessCanvas.style.display = 'none';
        roughnessPlaceholder.style.display = 'block';
    }

    if (settings.useAO) {
        generateAOMap(sourceCanvas, aoCanvas, settings.aoStrength, settings.isSeamless, tiling);
        aoCanvas.style.display = 'block';
        aoPlaceholder.style.display = 'none';
    } else {
        aoCanvas.style.display = 'none';
        aoPlaceholder.style.display = 'block';
    }

    if (settings.useHeight) {
        generateHeightMap(sourceCanvas, heightCanvas, settings.heightStrength, settings.isSeamless, tiling);
        heightCanvas.style.display = 'block';
        heightPlaceholder.style.display = 'none';
    } else {
        heightCanvas.style.display = 'none';
        heightPlaceholder.style.display = 'block';
    }

    if (settings.useMetallic) {
        generateMetallicMap(sourceCanvas, metallicCanvas, settings.metallicStrength, settings.isSeamless, tiling);
        metallicCanvas.style.display = 'block';
        metallicPlaceholder.style.display = 'none';
    } else {
        metallicCanvas.style.display = 'none';
        metallicPlaceholder.style.display = 'block';
    }

    // Update 3D Preview
    update3DMaterial(
        albedoCanvas,
        settings.useNormal ? normalCanvas : null,
        settings.useRoughness ? roughnessCanvas : null,
        settings.useAO ? aoCanvas : null,
        settings.useHeight ? heightCanvas : null,
        settings.useMetallic ? metallicCanvas : null,
        settings
    );
}

function enableButtons() {
    btnDownloadZip.disabled = false;
    btnDownloadCurrentTres.disabled = false;
}

// Initialize
const groqKeyInput = document.getElementById('groq-api-key');
if (groqKeyInput) {
    groqKeyInput.value = localStorage.getItem('groqApiKey') || '';
    groqKeyInput.addEventListener('input', (e) => {
        localStorage.setItem('groqApiKey', e.target.value);
    });
}
setupEventListeners();

initParticles();
initShaders();
