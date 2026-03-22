// js/godotExporter.js

import { processAlbedo, generateNormalMap, generateRoughnessMap, generateAOMap, generateHeightMap, generateMetallicMap } from './imageUtils.js';

/**
 * Generate a Godot 4 .tres file string for a StandardMaterial3D conditionally including maps.
 * By omitting `uid=` on ext_resources, and using purely relative paths (just the filename),
 * Godot will cleanly import and automatically assign its own internal UIDs.
 */
function generateTresFile(materialName, albedoName, normalName, roughnessName, aoName, heightName, metallicName, settings) {
    let extResources = `[ext_resource type="Texture2D" path="${albedoName}" id="1_albedo"]\n`;
    let properties = `resource_name = "${materialName}"\nalbedo_texture = ExtResource("1_albedo")\n`;
    let loadSteps = 2; // material + albedo

    if (settings.useNormal && normalName) {
        extResources += `[ext_resource type="Texture2D" path="${normalName}" id="2_normal"]\n`;
        properties += `normal_enabled = true\nnormal_texture = ExtResource("2_normal")\n`;
        loadSteps++;
    }
    if (settings.useRoughness && roughnessName) {
        extResources += `[ext_resource type="Texture2D" path="${roughnessName}" id="3_roughness"]\n`;
        properties += `roughness_texture = ExtResource("3_roughness")\n`;
        loadSteps++;
    }
    if (settings.useAO && aoName) {
        extResources += `[ext_resource type="Texture2D" path="${aoName}" id="4_ao"]\n`;
        properties += `ao_enabled = true\nao_texture = ExtResource("4_ao")\n`;
        loadSteps++;
    }
    if (settings.useHeight && heightName) {
        extResources += `[ext_resource type="Texture2D" path="${heightName}" id="5_height"]\n`;
        properties += `heightmap_enabled = true\nheightmap_texture = ExtResource("5_height")\n`;
        loadSteps++;
    }
    if (settings.useMetallic && metallicName) {
        extResources += `[ext_resource type="Texture2D" path="${metallicName}" id="6_metallic"]\n`;
        properties += `metallic = 1.0\nmetallic_texture = ExtResource("6_metallic")\n`;
        loadSteps++;
    }

    if (settings.removeBg) {
        properties += `transparency = 2\nalpha_scissor_threshold = 0.5\nalpha_antialiasing_mode = 0\n`;
    }

    return `[gd_resource type="StandardMaterial3D" load_steps=${loadSteps} format=3]

${extResources}
[resource]
${properties}`;
}

/**
 * Export a single material set as a .tres string
 */
export function exportMaterials(albedoCanvas, normalCanvas, roughnessCanvas, aoCanvas, heightCanvas, metallicCanvas, materialName, fileName, tresOnly = false, settings) {
    const albedoName = `${fileName}_albedo.png`;
    const normalName = `${fileName}_normal.png`;
    const roughnessName = `${fileName}_roughness.png`;
    const aoName = `${fileName}_ao.png`;
    const heightName = `${fileName}_height.png`;
    const metallicName = `${fileName}_metallic.png`;
    const tresName = `${fileName}_material.tres`;

    // Pass just the filenames for purely relative paths.
    const tresContent = generateTresFile(materialName, albedoName, normalName, roughnessName, aoName, heightName, metallicName, settings);

    if (tresOnly) {
        // Download just the .tres file
        const blob = new Blob([tresContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = tresName;
        link.click();
        URL.revokeObjectURL(link.href);
        return;
    }

    // Otherwise, generate a ZIP
    const zip = new JSZip();

    // Add textures
    if (albedoCanvas) {
        zip.file(albedoName, albedoCanvas.toDataURL("image/png").split(',')[1], {base64: true});
    }
    if (normalCanvas) {
        zip.file(normalName, normalCanvas.toDataURL("image/png").split(',')[1], {base64: true});
    }
    if (roughnessCanvas) {
        zip.file(roughnessName, roughnessCanvas.toDataURL("image/png").split(',')[1], {base64: true});
    }
    if (aoCanvas) {
        zip.file(aoName, aoCanvas.toDataURL("image/png").split(',')[1], {base64: true});
    }
    if (heightCanvas) {
        zip.file(heightName, heightCanvas.toDataURL("image/png").split(',')[1], {base64: true});
    }

    // Add .tres
    zip.file(tresName, tresContent);

    // Generate and download
    zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${fileName}_pack.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

/**
 * Batch export materials from an array of uploaded files, generating canvases dynamically.
 */
export async function exportBatchMaterials(uploadedFiles, settings) {
    if (uploadedFiles.length === 0) return;

    const zip = new JSZip();

    for (let i = 0; i < uploadedFiles.length; i++) {
        const item = uploadedFiles[i];

        // We always generate 1x scale for actual exported textures
        const albedoC = document.createElement('canvas');
        processAlbedo(item.image, albedoC, settings.isSeamless, 1, settings.seamlessAlgorithm, settings.removeBg, settings.removeBgMode, settings.removeBgTolerance);

        const normalC = document.createElement('canvas');
        const roughnessC = document.createElement('canvas');
        const aoC = document.createElement('canvas');
        const heightC = document.createElement('canvas');
        const metallicC = document.createElement('canvas');

        if (settings.useNormal) generateNormalMap(albedoC, normalC, settings.normalStrength, settings.isSeamless, 1);
        if (settings.useRoughness) generateRoughnessMap(albedoC, roughnessC, settings.roughnessStrength, settings.isSeamless, 1);
        if (settings.useAO) generateAOMap(albedoC, aoC, settings.aoStrength, settings.isSeamless, 1);
        if (settings.useHeight) generateHeightMap(albedoC, heightC, settings.heightStrength, settings.isSeamless, 1);
        if (settings.useMetallic) generateMetallicMap(albedoC, metallicC, settings.metallicStrength, settings.isSeamless, 1);

        const albedoName = `${item.name}_albedo.png`;
        const normalName = `${item.name}_normal.png`;
        const roughnessName = `${item.name}_roughness.png`;
        const aoName = `${item.name}_ao.png`;
        const heightName = `${item.name}_height.png`;
        const metallicName = `${item.name}_metallic.png`;
        const tresName = `${item.name}_material.tres`;

        // item.name is what we generated in `main.js` from the user's Apply button.
        const matName = item.name;

        // Since we are creating a zip containing folders matching the material name,
        // the textures and .tres will be side-by-side. Pure relative paths will work fine.
        const tresContent = generateTresFile(matName, albedoName, normalName, roughnessName, aoName, heightName, metallicName, settings);

        // Add to zip folder matching base name if multiple, otherwise flat
        const folder = uploadedFiles.length > 1 ? zip.folder(item.name) : zip;

        folder.file(albedoName, albedoC.toDataURL("image/png").split(',')[1], {base64: true});
        if (settings.useNormal) folder.file(normalName, normalC.toDataURL("image/png").split(',')[1], {base64: true});
        if (settings.useRoughness) folder.file(roughnessName, roughnessC.toDataURL("image/png").split(',')[1], {base64: true});
        if (settings.useAO) folder.file(aoName, aoC.toDataURL("image/png").split(',')[1], {base64: true});
        if (settings.useHeight) folder.file(heightName, heightC.toDataURL("image/png").split(',')[1], {base64: true});
        if (settings.useMetallic) folder.file(metallicName, metallicC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(tresName, tresContent);
    }

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = uploadedFiles.length > 1 ? `${settings.baseName}_Batch.zip` : `${uploadedFiles[0].name}_pack.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
}
