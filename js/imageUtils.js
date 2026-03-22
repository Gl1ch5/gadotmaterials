// js/imageUtils.js

/**
 * Process the base image (Albedo) onto the canvas, optionally making it seamless.
 */
export function processAlbedo(image, canvas, makeSeamless) {
    const ctx = canvas.getContext('2d');
    const width = image.width;
    const height = image.height;

    canvas.width = width;
    canvas.height = height;

    if (!makeSeamless) {
        // Draw original image
        ctx.drawImage(image, 0, 0, width, height);
        return;
    }

    // Make Seamless logic
    // Technique: Offset the image by 50% on x and y, then blend the original over the center
    // using a soft radial gradient mask to hide the hard edges.

    // 1. Draw Offset Image (Backdrop)
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    // Draw the 4 quadrants flipped around
    ctx.drawImage(image, halfW, halfH, width - halfW, height - halfH, 0, 0, width - halfW, height - halfH);
    ctx.drawImage(image, 0, halfH, halfW, height - halfH, width - halfW, 0, halfW, height - halfH);
    ctx.drawImage(image, halfW, 0, width - halfW, halfH, 0, height - halfH, width - halfW, halfH);
    ctx.drawImage(image, 0, 0, halfW, halfH, width - halfW, height - halfH, halfW, halfH);

    // 2. Create Masked Original Image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tctx = tempCanvas.getContext('2d');

    // Draw original image centered on temp canvas
    tctx.drawImage(image, 0, 0, width, height);

    // Apply Radial Gradient Mask (Alpha compositing)
    tctx.globalCompositeOperation = 'destination-in';
    const gradient = tctx.createRadialGradient(
        halfW, halfH, Math.min(halfW, halfH) * 0.2, // Inner circle (fully opaque)
        halfW, halfH, Math.min(halfW, halfH) * 0.8  // Outer circle (fades to transparent)
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    tctx.fillStyle = gradient;
    tctx.fillRect(0, 0, width, height);

    // 3. Blend the masked original image over the offset backdrop
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tempCanvas, 0, 0, width, height);
}

/**
 * Generate a Normal Map from an input canvas (e.g., Albedo)
 * Uses Sobel operator to find gradients in grayscale and convert to RGB normals.
 */
export function generateNormalMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    targetCanvas.width = width;
    targetCanvas.height = height;

    const ctx = targetCanvas.getContext('2d');
    const sourceCtx = sourceCanvas.getContext('2d');

    // Get pixel data
    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    const pixels = sourceData.data;

    const targetData = ctx.createImageData(width, height);
    const targetPixels = targetData.data;

    // Convert to Grayscale (height map approximation)
    const grayscale = new Float32Array(width * height);
    for (let i = 0; i < pixels.length; i += 4) {
        // Luminance formula
        grayscale[i / 4] = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255.0;
    }

    // Sobel Operator (3x3 Kernel)
    // X Gradient
    const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ];
    // Y Gradient
    const sobelY = [
        [-1, -2, -1],
         [0,  0,  0],
         [1,  2,  1]
    ];

    const getPixel = (x, y) => {
        // Handle wrap-around for seamless textures, otherwise clamp
        if (isSeamless) {
            x = (x + width) % width;
            y = (y + height) % height;
        } else {
            x = Math.max(0, Math.min(width - 1, x));
            y = Math.max(0, Math.min(height - 1, y));
        }
        return grayscale[y * width + x];
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let dx = 0;
            let dy = 0;

            // Apply Sobel kernel
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const val = getPixel(x + kx, y + ky);
                    dx += val * sobelX[ky + 1][kx + 1];
                    dy += val * sobelY[ky + 1][kx + 1];
                }
            }

            // Adjust strength
            dx *= strength;
            dy *= strength;

            // Normalize vector (dz is 1.0 for flat surface facing viewer)
            const dz = 1.0;
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Map from [-1, 1] to [0, 255]
            const nx = ((dx / length) * 0.5 + 0.5) * 255;
            const ny = ((dy / length) * 0.5 + 0.5) * 255; // Note: Godot expects Y+ (Up) or Y- (Down). We generate Y+ here.
            const nz = ((dz / length) * 0.5 + 0.5) * 255;

            const idx = (y * width + x) * 4;
            targetPixels[idx] = nx;     // R
            targetPixels[idx + 1] = ny; // G
            targetPixels[idx + 2] = nz; // B
            targetPixels[idx + 3] = 255; // A
        }
    }

    ctx.putImageData(targetData, 0, 0);
}
