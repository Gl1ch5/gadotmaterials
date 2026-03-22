// js/godotExporter.js

/**
 * Generate a Godot 4 .tres file string for a StandardMaterial3D.
 */
function generateTresFile(materialName, albedoName, normalName) {
    return `[gd_resource type="StandardMaterial3D" load_steps=3 format=3 uid="uid://material_${Date.now()}"]

[ext_resource type="Texture2D" uid="uid://albedo_${Date.now()}" path="res://${albedoName}" id="1_albedo"]
[ext_resource type="Texture2D" uid="uid://normal_${Date.now()}" path="res://${normalName}" id="2_normal"]

[resource]
resource_name = "${materialName}"
albedo_texture = ExtResource("1_albedo")
normal_enabled = true
normal_texture = ExtResource("2_normal")
`;
}

/**
 * Export materials either as a ZIP or a single .tres download.
 */
export function exportMaterials(albedoCanvas, normalCanvas, materialName, fileName, tresOnly = false) {
    const albedoName = `${fileName}_albedo.png`;
    const normalName = `${fileName}_normal.png`;
    const tresName = `${fileName}_material.tres`;

    const tresContent = generateTresFile(materialName, albedoName, normalName);

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
        const albedoData = albedoCanvas.toDataURL("image/png").split(',')[1];
        zip.file(albedoName, albedoData, {base64: true});
    }

    if (normalCanvas) {
        const normalData = normalCanvas.toDataURL("image/png").split(',')[1];
        zip.file(normalName, normalData, {base64: true});
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
