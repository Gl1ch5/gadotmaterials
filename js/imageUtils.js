// js/imageUtils.js

function applyTiling(sourceCanvas, targetCanvas, tiling) {
    if (tiling <= 1) return;

    const ctx = targetCanvas.getContext('2d');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    const tctx = tempCanvas.getContext('2d');
    tctx.drawImage(sourceCanvas, 0, 0);

    const pattern = ctx.createPattern(tempCanvas, 'repeat');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Scale pattern based on tiling
    const matrix = new DOMMatrix().scale(1 / tiling, 1 / tiling);
    pattern.setTransform(matrix);

    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
}

/**
 * Process the base image (Albedo) onto the canvas, optionally making it seamless and tiling it.
 */
export function processAlbedo(image, canvas, makeSeamless, tiling = 1, seamlessAlgorithm = "offset") {
    const ctx = canvas.getContext('2d');
    const width = image.width;
    const height = image.height;

    canvas.width = width;
    canvas.height = height;

    let drawSource = image;

    if (makeSeamless) {
        // Make Seamless logic
        const halfW = Math.floor(width / 2);
        const halfH = Math.floor(height / 2);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tctx = tempCanvas.getContext('2d');

        // Draw Offset Image (Backdrop)
        tctx.drawImage(image, halfW, halfH, width - halfW, height - halfH, 0, 0, width - halfW, height - halfH);
        tctx.drawImage(image, 0, halfH, halfW, height - halfH, width - halfW, 0, halfW, height - halfH);
        tctx.drawImage(image, halfW, 0, width - halfW, halfH, 0, height - halfH, width - halfW, halfH);
        tctx.drawImage(image, 0, 0, halfW, halfH, width - halfW, height - halfH, halfW, halfH);

        // Create Masked Original Image
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mctx = maskCanvas.getContext('2d');

        mctx.drawImage(image, 0, 0, width, height);
        mctx.globalCompositeOperation = 'destination-in';
        const gradient = mctx.createRadialGradient(
            halfW, halfH, Math.min(halfW, halfH) * 0.2,
            halfW, halfH, Math.min(halfW, halfH) * 0.8
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        mctx.fillStyle = gradient;
        mctx.fillRect(0, 0, width, height);

        // Blend
        tctx.globalCompositeOperation = 'source-over';
        tctx.drawImage(maskCanvas, 0, 0, width, height);

        drawSource = tempCanvas;
    } else if (makeSeamless && seamlessAlgorithm === "mirror") {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width * 2;
        tempCanvas.height = height * 2;
        const tctx = tempCanvas.getContext('2d');

        // Top left (normal)
        tctx.drawImage(image, 0, 0, width, height);

        // Top right (flip X)
        tctx.save();
        tctx.scale(-1, 1);
        tctx.drawImage(image, -width * 2, 0, width, height);
        tctx.restore();

        // Bottom left (flip Y)
        tctx.save();
        tctx.scale(1, -1);
        tctx.drawImage(image, 0, -height * 2, width, height);
        tctx.restore();

        // Bottom right (flip X and Y)
        tctx.save();
        tctx.scale(-1, -1);
        tctx.drawImage(image, -width * 2, -height * 2, width, height);
        tctx.restore();

        // Draw the 2x mirrored image scaled back to 1x to keep bounds
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = height;
        const fctx = finalCanvas.getContext('2d');
        fctx.drawImage(tempCanvas, 0, 0, width, height);

        drawSource = finalCanvas;
    }

    ctx.drawImage(drawSource, 0, 0, width, height);
    applyTiling(canvas, canvas, tiling);
}

/**
 * Fast box blur for smoothing noise before generating maps
 */
function boxBlur(pixels, width, height, radius) {
    if (radius < 1) return pixels;
    const result = new Float32Array(width * height);
    // Horizontal pass
    const temp = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, count = 0;
            for (let k = -radius; k <= radius; k++) {
                let px = Math.max(0, Math.min(width - 1, x + k));
                sum += pixels[y * width + px];
                count++;
            }
            temp[y * width + x] = sum / count;
        }
    }
    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0, count = 0;
            for (let k = -radius; k <= radius; k++) {
                let py = Math.max(0, Math.min(height - 1, y + k));
                sum += temp[py * width + x];
                count++;
            }
            result[y * width + x] = sum / count;
        }
    }
    return result;
}

/**
 * Helper to process pixels
 */
function processMap(sourceCanvas, targetCanvas, tiling, pixelProcessor) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    targetCanvas.width = width;
    targetCanvas.height = height;

    const ctx = targetCanvas.getContext('2d');
    const sourceCtx = sourceCanvas.getContext('2d');

    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    const targetData = ctx.createImageData(width, height);

    pixelProcessor(sourceData.data, targetData.data, width, height);

    ctx.putImageData(targetData, 0, 0);
    applyTiling(targetCanvas, targetCanvas, tiling);
}

/**
 * Generate a Normal Map from an input canvas (e.g., Albedo)
 * Uses Sobel operator to find gradients in grayscale and convert to RGB normals.
 */
export function generateNormalMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false, tiling = 1) {
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
    let grayscale = new Float32Array(width * height);
    for (let i = 0; i < pixels.length; i += 4) {
        // Luminance formula
        grayscale[i / 4] = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255.0;
    }

    // Pre-blur to reduce noise
    grayscale = boxBlur(grayscale, width, height, 1);

    // Scharr Operator (3x3 Kernel) - gives better rotational symmetry and smoother results than standard Sobel
    // X Gradient
    const sobelX = [
        [-3, 0, 3],
        [-10, 0, 10],
        [-3, 0, 3]
    ];
    // Y Gradient
    const sobelY = [
        [-3, -10, -3],
         [0,   0,  0],
         [3,  10,  3]
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
    applyTiling(targetCanvas, targetCanvas, tiling);
}

/**
 * Generate Roughness Map (Inverted grayscale with contrast)
 * Roughness is high when dark, low when bright. Often surfaces that are darker (crevices) are rougher.
 */
export function generateRoughnessMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false, tiling = 1) {
    processMap(sourceCanvas, targetCanvas, tiling, (src, dst, w, h) => {
        for (let i = 0; i < src.length; i += 4) {
            // Luminance
            let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);

            // Invert and apply contrast based on strength
            // base roughness around 128
            let r = 255 - lum;
            r = ((r / 255 - 0.5) * strength + 0.5) * 255;
            r = Math.max(0, Math.min(255, r));

            dst[i] = r;
            dst[i + 1] = r;
            dst[i + 2] = r;
            dst[i + 3] = 255;
        }
    });
}

/**
 * Generate Ambient Occlusion (AO) Map
 * Darkens crevices. We approximate by taking grayscale, blurring slightly, and enhancing contrast to isolate darks.
 */
export function generateAOMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false, tiling = 1) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    targetCanvas.width = width;
    targetCanvas.height = height;

    const ctx = targetCanvas.getContext('2d');
    const sourceCtx = sourceCanvas.getContext('2d');
    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    const targetData = ctx.createImageData(width, height);

    let grayscale = new Float32Array(width * height);
    for (let i = 0; i < sourceData.data.length; i += 4) {
        grayscale[i / 4] = (sourceData.data[i] * 0.299 + sourceData.data[i + 1] * 0.587 + sourceData.data[i + 2] * 0.114) / 255.0;
    }

    // Heavy blur for AO to emulate wide ambient lighting occlusion
    grayscale = boxBlur(grayscale, width, height, 3);

    for (let i = 0; i < grayscale.length; i++) {
        let lum = grayscale[i];
        let ao = Math.pow(lum, 1.0 + strength);
        ao = Math.max(0, Math.min(1, ao)) * 255;

        let idx = i * 4;
        targetData.data[idx] = ao;
        targetData.data[idx + 1] = ao;
        targetData.data[idx + 2] = ao;
        targetData.data[idx + 3] = 255;
    }

    ctx.putImageData(targetData, 0, 0);
    applyTiling(targetCanvas, targetCanvas, tiling);
}

/**
 * Generate Metallic Map
 * Metallic surfaces usually have strong highlights. We approximate by finding high luminance/contrast areas.
 */
export function generateMetallicMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false, tiling = 1) {
    processMap(sourceCanvas, targetCanvas, tiling, (src, dst, w, h) => {
        let minLum = 255;
        let maxLum = 0;

        for (let i = 0; i < src.length; i += 4) {
            let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
        }

        let range = maxLum - minLum;
        if (range === 0) range = 1;

        for (let i = 0; i < src.length; i += 4) {
            let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);

            // Normalize and threshold
            let normalized = (lum - minLum) / range;

            // Apply strength to curve: higher strength pushes more values towards metallic
            let metal = Math.pow(normalized, Math.max(0.1, 4.0 - strength)) * 255;
            metal = Math.max(0, Math.min(255, metal));

            dst[i] = metal;
            dst[i + 1] = metal;
            dst[i + 2] = metal;
            dst[i + 3] = 255;
        }
    });
}

/**
 * Generate Height Map
 * Standard grayscale map where bright is high and dark is low.
 * Normalizes luminance to 0-255 for better depth.
 */
export function generateHeightMap(sourceCanvas, targetCanvas, strength = 1.0, isSeamless = false, tiling = 1) {
    processMap(sourceCanvas, targetCanvas, tiling, (src, dst, w, h) => {
        let minLum = 255;
        let maxLum = 0;

        // Pass 1: find min/max
        for (let i = 0; i < src.length; i += 4) {
            let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
        }

        let range = maxLum - minLum;
        if (range === 0) range = 1; // prevent div by zero

        // Pass 2: normalize and apply strength
        for (let i = 0; i < src.length; i += 4) {
            let lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);

            // Normalize to 0-255 based on min/max of the image
            let normalized = ((lum - minLum) / range) * 255;

            // Adjust depth
            let height = ((normalized / 255 - 0.5) * strength + 0.5) * 255;
            height = Math.max(0, Math.min(255, height));

            dst[i] = height;
            dst[i + 1] = height;
            dst[i + 2] = height;
            dst[i + 3] = 255;
        }
    });
}
