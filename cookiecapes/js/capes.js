let modalSkinViewer = null;
let capeModal, modalCanvas, closeModalButton, modalCapeName, modalCapeId, modalUploaderName, modalSkinToggle, modalPanoramaSelect, modalOverlay;

const defaultSkinPath = "/img/skin.png";
const defaultModalBackgroundColor = 0x2a2a3a;
const CAPES_PER_PAGE = 12;

let allCapes = [];
let currentPage = 1;
let totalPages = 0;

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

function getPlayerSkinUrl(minecraftName) {
    if (!minecraftName || typeof minecraftName !== 'string' || !/^[a-zA-Z0-9_]{3,16}$/.test(minecraftName)) {
        console.warn(`Invalid Minecraft name for skin lookup: ${minecraftName}`);
        return defaultSkinPath;
    }
    return `https://starlightskins.lunareclipse.studio/render/skin/${minecraftName}/default`;
}

function displayCurrentPage() {
    const container = document.getElementById("capeContainer");
    if (!container) {
        console.error("Cape container not found!");
        return;
    }
    container.innerHTML = '';
    container.style.display = 'none';

    const startIndex = (currentPage - 1) * CAPES_PER_PAGE;
    const endIndex = startIndex + CAPES_PER_PAGE;
    const capesToShow = allCapes.slice(startIndex, endIndex);

    capesToShow.forEach((cape) => {
        const previewDiv = document.createElement("div");
        previewDiv.className = "cape-preview";
        previewDiv.style.cursor = 'pointer';

        const canvas = document.createElement("canvas");
        canvas.width = 180;
        canvas.height = 250;
        previewDiv.appendChild(canvas);

        const nameP = document.createElement("p");
        const capeNameText = cape.cape_name || "Unbenanntes Cape";
        nameP.textContent = capeNameText;
        previewDiv.appendChild(nameP);

        const uploaderName = cape.minecraft_name;
        const uploaderP = document.createElement("p");
        uploaderP.textContent = `von ${uploaderName}`;
        uploaderP.style.fontSize = '0.8em';
        uploaderP.style.color = '#aaa';
        uploaderP.style.marginTop = '-5px';
        previewDiv.appendChild(uploaderP);

        container.appendChild(previewDiv);

        let capeImageUrl = cape.cape_image_url;
        const capeId = cape.cape_id;

        if (capeImageUrl && capeImageUrl.startsWith('http://')) {
            const secureUrl = capeImageUrl.replace('http://api.cookieattack.de:8000', 'https://api.cookieattack.de:8989');
            capeImageUrl = secureUrl;
        }


        previewDiv.dataset.capeId = capeId;
        previewDiv.dataset.capeUrl = capeImageUrl;
        previewDiv.dataset.capeName = capeNameText;
        previewDiv.dataset.uploaderName = uploaderName;

        try {
            const viewer = new skinview3d.SkinViewer({
                canvas: canvas,
                width: canvas.width,
                height: canvas.height,
                skin: defaultSkinPath,
                background: 0x2a2a3a
            });

            viewer.loadCape(capeImageUrl, { backEquipment: 'cape' })
                .catch(err => console.error(`Failed to load cape ${capeImageUrl} for preview:`, err));

            viewer.fov = 70;
            viewer.zoom = 0.9;
            viewer.globalLight.intensity = 2.8;
            viewer.cameraLight.intensity = 0.7;
            viewer.autoRotate = true;
            viewer.autoRotateSpeed = 0.6;

            previewDiv.addEventListener('click', () => {
                const id = previewDiv.dataset.capeId;
                const url = previewDiv.dataset.capeUrl;
                const name = previewDiv.dataset.capeName;
                const uploader = previewDiv.dataset.uploaderName;
                if (url && id !== undefined && name && uploader) {
                    openCapeModal(id, url, name, uploader);
                } else {
                    console.error("Missing data for modal", previewDiv.dataset);
                    alert("Fehler: Details für dieses Cape konnten nicht geladen werden.");
                }
            });

        } catch (viewerError) {
            console.error("Error initializing gallery SkinViewer:", viewerError);
            const errorP = document.createElement("p");
            errorP.style.cssText = 'font-size: 0.8em; color: red; margin-top: 5px;';
            errorP.textContent = 'Vorschaufehler';
            previewDiv.appendChild(errorP);
            previewDiv.style.opacity = '0.7';
            previewDiv.style.cursor = 'not-allowed';
        }
    });

    container.style.display = 'flex';
    renderPaginationControls();
}

function renderPaginationControls() {
    const controlsContainer = document.getElementById("paginationControls");
    if (!controlsContainer) {
        console.error("Pagination controls container not found!");
        return;
    }
    controlsContainer.innerHTML = '';

    if (totalPages <= 1) {
        return;
    }

    const prevButton = document.createElement("button");
    prevButton.textContent = "‹ Zurück";
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(currentPage - 1);
    controlsContainer.appendChild(prevButton);

    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `Seite ${currentPage} von ${totalPages}`;
    controlsContainer.appendChild(pageInfo);

    const nextButton = document.createElement("button");
    nextButton.textContent = "Weiter ›";
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    controlsContainer.appendChild(nextButton);
}

function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        currentPage = newPage;
        displayCurrentPage();
        const container = document.getElementById("capeContainer");
        if (container) {
             window.scrollTo({ top: container.offsetTop - 100, behavior: 'smooth' });
        }
    }
}

async function fetchAllCapesAndPaginate() {
    const container = document.getElementById("capeContainer");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const controlsContainer = document.getElementById("paginationControls");

    if (!container || !loadingIndicator || !controlsContainer) {
        console.error("Essential elements for pagination not found.");
         if(loadingIndicator) loadingIndicator.innerHTML = '<p style="color: #ff6b6b;">Seitenfehler: Wichtige Elemente fehlen.</p>';
        return;
    }

    loadingIndicator.style.display = 'block';
    container.style.display = 'none';
    controlsContainer.innerHTML = '';

    try {
        const response = await fetch("https://api.cookieattack.de:8989/list_capes");

        if (!response.ok) {
            const text = await response.text();
            console.error("API Error (fetchAllCapesAndPaginate):", response.status, text);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        const capes = result.capes || [];

        allCapes = capes.filter(cape =>
            cape.cape_image_url && cape.cape_image_url.trim() !== "" &&
            cape.minecraft_name && cape.minecraft_name.trim() !== "" &&
            cape.cape_id !== undefined && cape.cape_id !== null
        );

        totalPages = Math.ceil(allCapes.length / CAPES_PER_PAGE);
        currentPage = 1;

        loadingIndicator.style.display = 'none';

        if (allCapes.length === 0) {
            container.innerHTML = '<p style="color: #ccc;">Keine Capes zum Anzeigen gefunden.</p>';
            container.style.display = 'flex';
        } else {
            displayCurrentPage();
        }

    } catch (err) {
        console.error("Error fetching or setting up pagination:", err);
        loadingIndicator.style.display = 'none';
        container.innerHTML = `<p style="color: #ff6b6b;">Ein Fehler ist aufgetreten: ${err.message || 'Capes konnten nicht geladen werden.'}</p>`;
        container.style.display = 'flex';
        controlsContainer.innerHTML = '';
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
            modalSkinViewer.autoRotateSpeed = 1;
            modalSkinViewer.animation = new skinview3d.WalkingAnimation();
            modalSkinViewer.animation.speed = 0.8;
            modalSkinViewer.animation.paused = true;
            console.log("Modal SkinViewer initialized.");
        } catch (e) {
            console.error("Failed to initialize modal SkinViewer:", e);
            if (modalCanvas.parentElement) {
                modalCanvas.parentElement.innerHTML = "<p style='color: #ff6b6b;'>3D-Vorschau konnte nicht geladen werden.</p>";
            }
            modalSkinViewer = null;
        }
    }
}

function openCapeModal(capeId, capeUrl, capeName, uploaderName) {
    if (!capeModal) {
        console.error("Modal elements not ready.");
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
    modalCapeId.textContent = capeId !== undefined ? capeId : "N/A";
    modalUploaderName.textContent = uploaderName || "Unbekannt";

    modalSkinToggle.checked = true;
    modalPanoramaSelect.value = 'none';

    const skinUrl = getPlayerSkinUrl(uploaderName);

    modalSkinViewer.loadSkin(skinUrl)
        .then(() => console.log(`Modal: Loaded skin for ${uploaderName} from ${skinUrl}`))
        .catch(err => {
            console.error(`Modal: Failed to load skin from ${skinUrl}:`, err);
            modalSkinViewer.loadSkin(defaultSkinPath)
                .catch(e => console.error("Modal: Failed to load fallback skin:", e));
            modalUploaderName.textContent += " (Skin nicht gefunden)";
        });

    modalSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
        .then(() => console.log(`Modal: Loaded cape ${capeId} from ${capeUrl}`))
        .catch(err => {
            console.error(`Modal: Failed to load cape ${capeUrl}:`, err);
            modalCapeName.textContent += " (Cape-Ladefehler)";
        });

    modalSkinViewer.loadPanorama(null);
    modalSkinViewer.background = defaultModalBackgroundColor;

    modalSkinViewer.autoRotate = true;
    if (modalSkinViewer.animation) {
        modalSkinViewer.animation.paused = false;
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    capeModal = document.getElementById('capeModal');
    modalCanvas = document.getElementById('modalCanvas');
    closeModalButton = document.getElementById('closeModalButton');
    modalCapeName = document.getElementById('modalCapeName');
    modalCapeId = document.getElementById('modalCapeId');
    modalUploaderName = document.getElementById('modalUploaderName');
    modalSkinToggle = document.getElementById('modalSkinToggle');
    modalPanoramaSelect = document.getElementById('modalPanoramaSelect');
    modalOverlay = capeModal ? capeModal.querySelector('.modal-overlay') : null;

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeCapeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeCapeModal);
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && capeModal && !capeModal.classList.contains('hidden')) {
            closeCapeModal();
        }
    });

    if (modalSkinToggle) {
        modalSkinToggle.addEventListener('change', () => {
            if (!modalSkinViewer) return;
            if (modalSkinToggle.checked) {
                const currentUploader = modalUploaderName.textContent.split(' ')[0];
                const skinUrl = getPlayerSkinUrl(currentUploader);
                modalSkinViewer.loadSkin(skinUrl)
                   .catch(err => {
                        console.error("Modal: Failed to reload skin:", err);
                        modalSkinViewer.loadSkin(defaultSkinPath);
                    });
            } else {
                modalSkinViewer.loadSkin(null)
                    .catch(err => console.error("Modal: Failed to unload skin:", err));
            }
        });
    }

    if (modalPanoramaSelect) {
        modalPanoramaSelect.addEventListener('change', () => {
            if (!modalSkinViewer) return;
            const selection = modalPanoramaSelect.value;
            let panoramaPath = null;

            if (selection === 'panorama1') {
                panoramaPath = '../img/panorama1.png';
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

    fetchAllCapesAndPaginate();
});