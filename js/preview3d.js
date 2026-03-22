// js/preview3d.js

let scene, camera, renderer, mesh, material;
let geometries = {};

export function init3DViewer() {
    const container = document.getElementById('viewer3d');
    const placeholder = document.getElementById('viewer3dPlaceholder');
    const geometrySelect = document.getElementById('geometrySelect');

    // Create Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 3.5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // We only attach canvas when we have a texture
    // container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffaaaa, 0.5, 10);
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    // Geometries
    geometries = {
        cube: new THREE.BoxGeometry(2, 2, 2),
        sphere: new THREE.SphereGeometry(1.2, 64, 64),
        plane: new THREE.PlaneGeometry(3, 3)
    };

    // Material
    material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.0
    });

    // Mesh
    mesh = new THREE.Mesh(geometries.cube, material);
    scene.add(mesh);

    // Resize Handler
    window.addEventListener('resize', () => {
        if (!renderer || !container.clientWidth) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Geometry Switcher
    geometrySelect.addEventListener('change', (e) => {
        mesh.geometry = geometries[e.target.value];
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        if (mesh && geometrySelect.value !== 'plane') {
            mesh.rotation.y += 0.005;
            mesh.rotation.x += 0.002;
        } else if (mesh && geometrySelect.value === 'plane') {
            mesh.rotation.x = 0;
            mesh.rotation.y = 0;
        }
        renderer.render(scene, camera);
    }
    animate();
}

/**
 * Updates the 3D material with the newly generated 2D canvases.
 */
export function update3DMaterial(albedoCanvas, normalCanvas, roughnessCanvas, aoCanvas, heightCanvas, metallicCanvas, settings) {
    const container = document.getElementById('viewer3d');
    const placeholder = document.getElementById('viewer3dPlaceholder');

    if (!albedoCanvas) {
        // Clear viewer
        if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
        placeholder.style.display = 'block';
        return;
    }

    // Attach if not there
    if (!container.contains(renderer.domElement)) {
        container.appendChild(renderer.domElement);
        placeholder.style.display = 'none';

        // Trigger resize to fix initial render bug
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    const disposeTexture = (tex) => { if (tex) tex.dispose(); };

    // Update Albedo
    disposeTexture(material.map);
    material.map = new THREE.CanvasTexture(albedoCanvas);
    if (THREE.sRGBEncoding) { // Three.js r128 compatibility
        material.map.encoding = THREE.sRGBEncoding;
    }
    material.color.setHex(0xffffff); // Reset base color

    // Update Normal
    disposeTexture(material.normalMap);
    if (normalCanvas) {
        material.normalMap = new THREE.CanvasTexture(normalCanvas);
        // Strength is baked into the normal map generation, but we can set scale
        material.normalScale.set(1, 1);
    } else {
        material.normalMap = null;
    }

    // Update Roughness
    disposeTexture(material.roughnessMap);
    if (roughnessCanvas) {
        material.roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
        material.roughness = 1.0; // Let map drive it entirely
    } else {
        material.roughnessMap = null;
        material.roughness = 0.5;
    }

    // Update AO
    disposeTexture(material.aoMap);
    if (aoCanvas) {
        material.aoMap = new THREE.CanvasTexture(aoCanvas);
        material.aoMapIntensity = 1.0;
        // AO needs a second UV set in Three.js sometimes, but standard material will use UV1 if geometry has it
    } else {
        material.aoMap = null;
    }

    // Update Displacement (Height)
    disposeTexture(material.displacementMap);
    if (heightCanvas) {
        material.displacementMap = new THREE.CanvasTexture(heightCanvas);
        material.displacementScale = 0.1; // Small scale so it doesn't break
        material.displacementBias = -0.05;
    } else {
        material.displacementMap = null;
        material.displacementScale = 0;
    }

    // Update Metallic
    disposeTexture(material.metalnessMap);
    if (metallicCanvas) {
        material.metalnessMap = new THREE.CanvasTexture(metallicCanvas);
        material.metalness = 1.0;
    } else {
        material.metalnessMap = null;
        material.metalness = 0.0;
    }

    material.needsUpdate = true;
}
