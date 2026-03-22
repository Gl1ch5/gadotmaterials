// particles.js

export function initParticles() {
    const btnGenerate = document.getElementById('btnGenerateParticles');
    const promptInput = document.getElementById('particlesPrompt');
    const statusText = document.getElementById('particlesStatus');
    const outputArea = document.getElementById('particlesOutput');
    const btnDownload = document.getElementById('btnDownloadParticles');

    btnGenerate.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('groqApiKey');
        if (!apiKey) {
            statusText.textContent = 'Error: Please enter a Groq API Key in the Materials tab first.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt) {
            statusText.textContent = 'Error: Please describe the particle effect.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        statusText.textContent = 'Generating Godot 4 ParticleProcessMaterial...';
        statusText.style.color = 'var(--text-color)';
        btnGenerate.disabled = true;

        try {
            const systemPrompt = `You are an expert Godot 4 engine technical artist.
The user wants a ParticleProcessMaterial for a GPUParticles3D node based on their description.
Reply ONLY with the raw Godot .tres file content for a ParticleProcessMaterial. Do not use markdown blocks like \`\`\`gdscript. Just the raw text. Make sure format=3.`;

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
            const result = data.choices[0].message.content.trim();

            // Clean up possible markdown if the AI ignored instructions
            let cleanResult = result;
            if (cleanResult.startsWith('```')) {
                cleanResult = cleanResult.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
            }

            outputArea.value = cleanResult;
            statusText.textContent = 'Generated successfully!';
            statusText.style.color = 'green';
            btnDownload.style.display = 'inline-block';

        } catch (error) {
            console.error(error);
            statusText.textContent = `Error: ${error.message}`;
            statusText.style.color = 'var(--error-color, red)';
        } finally {
            btnGenerate.disabled = false;
        }
    });

    btnDownload.addEventListener('click', () => {
        const content = outputArea.value;
        if (!content) return;

        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'particles_material.tres';
        link.click();
        URL.revokeObjectURL(link.href);
    });
}
