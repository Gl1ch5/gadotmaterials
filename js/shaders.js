// shaders.js

export function initShaders() {
    const btnGenerate = document.getElementById('btnGenerateShader');
    const promptInput = document.getElementById('shadersPrompt');
    const statusText = document.getElementById('shadersStatus');
    const outputArea = document.getElementById('shadersOutput');
    const btnDownload = document.getElementById('btnDownloadShader');

    btnGenerate.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('groqApiKey');
        if (!apiKey) {
            statusText.textContent = 'Error: Please enter a Groq API Key in the Materials tab first.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt) {
            statusText.textContent = 'Error: Please describe the shader effect.';
            statusText.style.color = 'var(--error-color, red)';
            return;
        }

        statusText.textContent = 'Generating Godot 4 spatial shader...';
        statusText.style.color = 'var(--text-color)';
        btnGenerate.disabled = true;

        try {
            const systemPrompt = `You are an expert Godot 4 engine technical artist and shader developer.
The user wants a spatial or canvas_item shader based on their description. Assume spatial unless specified.
Reply ONLY with the raw Godot .gdshader code. Do not use markdown blocks like \`\`\`glsl. Just the raw text. Must start with shader_type spatial; or shader_type canvas_item;.`;

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
        link.download = 'effect.gdshader';
        link.click();
        URL.revokeObjectURL(link.href);
    });
}
