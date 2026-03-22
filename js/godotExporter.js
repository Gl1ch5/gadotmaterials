// js/godotExporter.js

import { processAlbedo, generateNormalMap, generateRoughnessMap, generateAOMap, generateHeightMap } from './imageUtils.js';

/**
 * Generate a Godot 4 .tres file string for a StandardMaterial3D.
 */
function generateTresFile(materialName, albedoName, normalName, roughnessName, aoName, heightName) {
    const uidSuffix = Math.floor(Math.random() * 1000000);
    return `[gd_resource type="StandardMaterial3D" load_steps=6 format=3 uid="uid://material_${Date.now()}_${uidSuffix}"]

[ext_resource type="Texture2D" uid="uid://albedo_${Date.now()}_${uidSuffix}" path="res://${albedoName}" id="1_albedo"]
[ext_resource type="Texture2D" uid="uid://normal_${Date.now()}_${uidSuffix}" path="res://${normalName}" id="2_normal"]
[ext_resource type="Texture2D" uid="uid://roughness_${Date.now()}_${uidSuffix}" path="res://${roughnessName}" id="3_roughness"]
[ext_resource type="Texture2D" uid="uid://ao_${Date.now()}_${uidSuffix}" path="res://${aoName}" id="4_ao"]
[ext_resource type="Texture2D" uid="uid://height_${Date.now()}_${uidSuffix}" path="res://${heightName}" id="5_height"]

[resource]
resource_name = "${materialName}"
albedo_texture = ExtResource("1_albedo")
roughness_texture = ExtResource("3_roughness")
normal_enabled = true
normal_texture = ExtResource("2_normal")
ao_enabled = true
ao_texture = ExtResource("4_ao")
heightmap_enabled = true
heightmap_texture = ExtResource("5_height")
`;
}

/**
 * Export a single material set as a .tres string
 */
export function exportMaterials(albedoCanvas, normalCanvas, roughnessCanvas, aoCanvas, heightCanvas, materialName, fileName, tresOnly = false) {
    const albedoName = `${fileName}_albedo.png`;
    const normalName = `${fileName}_normal.png`;
    const roughnessName = `${fileName}_roughness.png`;
    const aoName = `${fileName}_ao.png`;
    const heightName = `${fileName}_height.png`;
    const tresName = `${fileName}_material.tres`;

    const tresContent = generateTresFile(materialName, albedoName, normalName, roughnessName, aoName, heightName);

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
        const normalC = document.createElement('canvas');
        const roughnessC = document.createElement('canvas');
        const aoC = document.createElement('canvas');
        const heightC = document.createElement('canvas');

        processAlbedo(item.image, albedoC, settings.isSeamless, 1);
        generateNormalMap(albedoC, normalC, settings.normalStrength, settings.isSeamless, 1);
        generateRoughnessMap(albedoC, roughnessC, settings.roughnessStrength, settings.isSeamless, 1);
        generateAOMap(albedoC, aoC, settings.aoStrength, settings.isSeamless, 1);
        generateHeightMap(albedoC, heightC, settings.heightStrength, settings.isSeamless, 1);

        const albedoName = `${item.name}_albedo.png`;
        const normalName = `${item.name}_normal.png`;
        const roughnessName = `${item.name}_roughness.png`;
        const aoName = `${item.name}_ao.png`;
        const heightName = `${item.name}_height.png`;
        const tresName = `${item.name}_material.tres`;

        const matName = uploadedFiles.length === 1 ? settings.baseName : `${settings.baseName}_${item.name}`;

        const tresContent = generateTresFile(matName, albedoName, normalName, roughnessName, aoName, heightName);

        // Add to zip folder matching base name if multiple, otherwise flat
        const folder = uploadedFiles.length > 1 ? zip.folder(item.name) : zip;

        folder.file(albedoName, albedoC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(normalName, normalC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(roughnessName, roughnessC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(aoName, aoC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(heightName, heightC.toDataURL("image/png").split(',')[1], {base64: true});
        folder.file(tresName, tresContent);
    }

    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = uploadedFiles.length > 1 ? `${settings.baseName}_Batch.zip` : `${uploadedFiles[0].name}_pack.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
}
