const defaultSkinPath = "/img/skin.png";
const defaultModalBackgroundColor = 0x2a2a3a;
const galleryBackgroundColor = 0x2a2a3a;

let modalSkinViewer = null;
let capeModal, modalCanvas, closeModalButton, modalCapeName, modalCapeId, modalSkinToggle, modalPanoramaSelect, modalOverlay;

window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add("floating");
        } else {
            header.classList.remove("floating");
        }
    }
});

function getCorrectCapeImageUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        return null;
    }
    try {
        const filename = originalUrl.substring(originalUrl.lastIndexOf('/') + 1);
        if (!filename) return null;
        return `https://api.cookieattack.de:8989/capes/${filename}`;
    } catch (e) {
        console.error("Error constructing correct cape image URL from:", originalUrl, e);
        return null;
    }
}

function initializeModalViewer() {
    if (!modalSkinViewer && modalCanvas) {
        try {
            modalSkinViewer = new skinview3d.SkinViewer({
                canvas: modalCanvas,
                width: modalCanvas.width,
                height: modalCanvas.height,
                skin: defaultSkinPath,
                background: defaultModalBackgroundColor
            });
            modalSkinViewer.fov = 65;
            modalSkinViewer.zoom = 0.8;
            modalSkinViewer.globalLight.intensity = 2.5;
            modalSkinViewer.cameraLight.intensity = 1.0;
            modalSkinViewer.autoRotate = false;
            modalSkinViewer.autoRotateSpeed = 0;
            modalSkinViewer.animation = new skinview3d.WalkingAnimation(); 
            modalSkinViewer.animation.speed = 0;
            modalSkinViewer.animation.paused = true;

            console.log("Modal SkinViewer initialized.");

        } catch (e) {
            console.error("Failed to initialize modal SkinViewer:", e);
            if (modalCanvas.parentElement) {
                modalCanvas.parentElement.innerHTML = "<p style='color: #ff6b6b;'>3D-Vorschau konnte nicht geladen werden.</p>";
            }
        }
    }
}

function openCapeModal(capeId, capeUrl, capeName) {
    if (!capeModal || !modalCanvas || !modalCapeName || !modalCapeId || !modalSkinToggle || !modalPanoramaSelect) {
        console.error("Modal elements not ready or found. Ensure DOMContentLoaded has run and IDs are correct.");
        alert("Fehler: Modal konnte nicht geöffnet werden, Elemente fehlen.");
        return;
    }

    if (!modalSkinViewer) {
        initializeModalViewer();
        if (!modalSkinViewer) {
             alert("Fehler: 3D-Vorschau konnte nicht initialisiert werden.");
             return;
        }
    }

    modalCapeName.textContent = capeName || "Unbenanntes Cape";
    modalCapeId.textContent = capeId !== undefined ? `ID: ${capeId}` : "ID: N/A";
    modalSkinToggle.checked = true;
    modalPanoramaSelect.value = 'none';

    modalSkinViewer.loadSkin(defaultSkinPath)
        .catch(err => console.error("Modal: Failed to load default skin:", err));

    modalSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
        .then(() => console.log(`Modal: Loaded cape ${capeId} from ${capeUrl}`))
        .catch(err => {
            console.error(`Modal: Failed to load cape ${capeUrl}:`, err);
            modalCapeName.textContent += " (Cape Ladefehler)";
        });

    modalSkinViewer.loadPanorama(null);
    modalSkinViewer.background = defaultModalBackgroundColor;

    modalSkinViewer.autoRotate = true;
    if (modalSkinViewer.animation) {
        modalSkinViewer.animation.paused = false;
        modalSkinViewer.animation.speed = 1.0;
    }

    capeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCapeModal() {
    if (!capeModal || !modalSkinViewer) return;

    capeModal.classList.add('hidden');
    document.body.style.overflow = '';

    modalSkinViewer.autoRotate = false;
    if (modalSkinViewer.animation) {
        modalSkinViewer.animation.paused = true;
        modalSkinViewer.animation.speed = 0;
    }
}

async function fetchAllCapes() {
    try {
        const response = await fetch("https://api.cookieattack.de:8989/list_capes");

        if (!response.ok) {
            const text = await response.text();
            console.error("API-Fehler (fetchAllCapes):", response.status, text);
            const container = document.getElementById("capeContainer");
            if(container) container.innerHTML = '<p style="color: #ff6b6b;">Fehler beim Laden der Capes.</p>';
            return;
        }

        const result = await response.json();
        const capes = result.capes || [];
        const validCapes = capes.filter(cape => cape.cape_image_url && cape.cape_image_url.trim() !== "");

        const container = document.getElementById("capeContainer");
        if (!container) {
             console.error("Element with ID 'capeContainer' not found for fetchAllCapes.");
             return;
        }

        if (validCapes.length === 0) {
            console.warn("Keine gültigen Capes zum Anzeigen gefunden (fetchAllCapes).");
            container.innerHTML = '<p style="color: #ccc;">Keine Capes zum Anzeigen gefunden.</p>';
            return;
        }

        container.innerHTML = "";

        validCapes.forEach((cape) => {
            const previewDiv = document.createElement("div");
            previewDiv.className = "cape-preview";

            const canvas = document.createElement("canvas");
            canvas.width = 200;
            canvas.height = 280;
            previewDiv.appendChild(canvas);

            const nameP = document.createElement("p");
            const capeNameText = cape.cape_name || "Unbenanntes Cape";
            nameP.textContent = capeNameText;
            previewDiv.appendChild(nameP);

            container.appendChild(previewDiv);

            const correctedImageUrl = getCorrectCapeImageUrl(cape.cape_image_url);
            const capeId = cape.cape_id;

            if (!correctedImageUrl) {
                console.warn(`Could not generate correct image URL for cape ID ${capeId}`);
                 const errorP = document.createElement("p");
                 errorP.style.fontSize = "0.8em";
                 errorP.style.color = "red";
                 errorP.textContent = "Bild-URL ungültig";
                 previewDiv.appendChild(errorP);
                return;
            }

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    skin: defaultSkinPath,
                    background: galleryBackgroundColor
                });

                viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                    .catch(err => console.error(`Failed to load cape ${correctedImageUrl} for preview (ID: ${capeId}):`, err));

                viewer.fov = 70;
                viewer.zoom = 0.85;
                viewer.globalLight.intensity = 3;
                viewer.cameraLight.intensity = 3;
                viewer.autoRotate = true;
                viewer.animation = new skinview3d.WalkingAnimation();
                viewer.animation.speed = 0.5;

                previewDiv.addEventListener("click", () => {
                    console.log(`Clicked cape preview ID: ${capeId}, Name: ${capeNameText}`);
                    openCapeModal(capeId, correctedImageUrl, capeNameText);
                });

            } catch (viewerError) {
                 console.error(`Error initializing gallery SkinViewer for cape ID ${capeId}:`, viewerError);
                 previewDiv.innerHTML = `<p>${capeNameText}</p><p style="font-size: 0.8em; color: red;">Vorschaufehler</p>`;
            }
        });

    } catch (err) {
        console.error("Fehler beim Laden der Capes (fetchAllCapes):", err);
        const container = document.getElementById("capeContainer");
        if(container) container.innerHTML = '<p style="color: #ff6b6b;">Ein Fehler ist aufgetreten beim Laden der Capes.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    capeModal = document.getElementById('capeModal');
    modalCanvas = document.getElementById('modalCanvas');
    closeModalButton = document.getElementById('closeModalButton');
    modalCapeName = document.getElementById('modalCapeName');
    modalCapeId = document.getElementById('modalCapeId');
    modalSkinToggle = document.getElementById('modalSkinToggle');
    modalPanoramaSelect = document.getElementById('modalPanoramaSelect');
    modalOverlay = capeModal ? capeModal.querySelector('.modal-overlay') : null;

    if (!capeModal || !modalCanvas || !closeModalButton || !modalCapeName || !modalCapeId || !modalSkinToggle || !modalPanoramaSelect || !modalOverlay) {
        console.warn("One or more modal elements could not be found. Modal functionality might be impaired.");
    } else {
        closeModalButton.addEventListener('click', closeCapeModal);

        modalOverlay.addEventListener('click', closeCapeModal);

        modalSkinToggle.addEventListener('change', () => {
            if (!modalSkinViewer) return;
            if (modalSkinToggle.checked) {
                modalSkinViewer.loadSkin(defaultSkinPath)
                    .catch(err => console.error("Modal: Failed to load skin:", err));
            } else {
                modalSkinViewer.loadSkin(null)
                    .catch(err => console.error("Modal: Failed to unload skin:", err));
            }
        });

        modalPanoramaSelect.addEventListener('change', () => {
            if (!modalSkinViewer) return;
            const selection = modalPanoramaSelect.value;
            let panoramaPath = null;

            if (selection === 'panorama1') {
                panoramaPath = '/img/panorama1.png';
            } else if (selection === 'panorama2') {
                 panoramaPath = '/img/panorama2.png';
            }

            if (panoramaPath) {
                modalSkinViewer.loadPanorama(panoramaPath)
                    .then(() => console.log("Modal: Loaded panorama", panoramaPath))
                    .catch(err => {
                        console.error("Modal: Failed to load panorama:", err);
                        alert("Panorama konnte nicht geladen werden.");
                        modalSkinViewer.loadPanorama(null);
                        modalSkinViewer.background = defaultModalBackgroundColor;
                        modalPanoramaSelect.value = 'none';
                    });
            } else {
                modalSkinViewer.loadPanorama(null);
                modalSkinViewer.background = defaultModalBackgroundColor;
                console.log("Modal: Reset to default background.");
            }
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && capeModal && !capeModal.classList.contains('hidden')) {
            closeCapeModal();
        }
    });
    fetchAllCapes();
});