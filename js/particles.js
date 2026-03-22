// particles.js

export function initParticles() {
    const btnGenerate = document.getElementById('btnGenerateParticles');
    const promptInput = document.getElementById('particlesPrompt');
    const statusText = document.getElementById('particlesStatus');
    const outputArea = document.getElementById('particlesOutput');
    const fileInput = document.getElementById('particleFileInput');
    const dropZone = document.getElementById('dropZoneParticles');
    const previewImg = document.getElementById('particlePreviewImg');
    const hFramesInput = document.getElementById('hFrames');
    const vFramesInput = document.getElementById('vFrames');
    const groqKeyInput = document.getElementById('groqApiKeyParticles');

    let uploadedFileName = 'particle_sprite.png';
    let uploadedFileBase64 = null;
    let generatedProcessMaterial = '';
    let generatedBillboardMaterial = '';

    // Load API Key
    groqKeyInput.value = localStorage.getItem('groqApiKey') || '';
    groqKeyInput.addEventListener('input', (e) => {
        localStorage.setItem('groqApiKey', e.target.value);
    });

    // File Upload Logic
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-color)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }
        uploadedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            uploadedFileBase64 = e.target.result.split(',')[1];
            statusText.textContent = `Loaded ${uploadedFileName}`;
        };
        reader.readAsDataURL(file);
    }

    function generateBillboardMaterial(textureName, hFrames, vFrames) {
        let props = `transparency = 1\nshading_mode = 0\nvertex_color_use_as_albedo = true\nalbedo_texture = ExtResource("1_tex")\nbillboard_mode = 3\nbillboard_keep_scale = true\nparticles_anim_h_frames = ${hFrames}\nparticles_anim_v_frames = ${vFrames}\nparticles_anim_loop = false\n`;

        return `[gd_resource type="StandardMaterial3D" load_steps=2 format=3]

[ext_resource type="Texture2D" path="${textureName}" id="1_tex"]

[resource]
${props}`;
    }

    btnGenerate.addEventListener('click', async () => {
        const apiKey = groqKeyInput.value.trim();
        if (!apiKey) {
            statusText.textContent = 'Error: Please enter a Groq API Key.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt) {
            statusText.textContent = 'Error: Please describe the particle effect.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        if (!uploadedFileBase64) {
            statusText.textContent = 'Error: Please upload a sprite or spritesheet first.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        const hFrames = parseInt(hFramesInput.value) || 1;
        const vFrames = parseInt(vFramesInput.value) || 1;
        const isAnimated = (hFrames > 1 || vFrames > 1);

        statusText.textContent = 'Generating Godot 4 ParticleProcessMaterial...';
        statusText.style.color = 'var(--text-color)';
        btnGenerate.disabled = true;

        try {
            const systemPrompt = `You are an expert Godot 4 engine technical artist.
The user wants a ParticleProcessMaterial for a GPUParticles3D node based on their description.
Reply ONLY with the raw Godot .tres file content for a ParticleProcessMaterial. Do not use markdown blocks like \`\`\`gdscript. Just the raw text. Make sure format=3.
IMPORTANT: The user has uploaded a sprite with h_frames=${hFrames} and v_frames=${vFrames}.
${isAnimated ? "Because it is an animated spritesheet, YOU MUST include anim_speed_max and anim_speed_min in the ParticleProcessMaterial to drive the animation. You should also consider color ramps and scale curves based on the prompt." : "This is a single static sprite. Do not use anim_speed properties. Consider color ramps, emissions, and scales."}`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            let result = data.choices[0].message.content.trim();

            if (result.startsWith('```')) {
                result = result.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
            }

            generatedProcessMaterial = result;
            generatedBillboardMaterial = generateBillboardMaterial(uploadedFileName, hFrames, vFrames);

            outputArea.value = generatedProcessMaterial;

            // Generate ZIP
            statusText.textContent = 'Packaging ZIP...';

            const zip = new JSZip();
            zip.file(uploadedFileName, uploadedFileBase64, {base64: true});
            zip.file('particle_billboard_material.tres', generatedBillboardMaterial);
            zip.file('particle_process_material.tres', generatedProcessMaterial);

            zip.generateAsync({type:"blob"}).then(function(content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'godot_particle_package.zip';
                link.click();
                URL.revokeObjectURL(link.href);

                statusText.textContent = 'Generated and downloaded successfully!';
                statusText.style.color = 'green';
            });

        } catch (error) {
            console.error(error);
            statusText.textContent = `Error: ${error.message}`;
            statusText.style.color = 'var(--error-color, red)';
        } finally {
            btnGenerate.disabled = false;
        }
    });
}
