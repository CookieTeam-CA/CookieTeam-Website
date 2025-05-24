let modalSkinViewer = null;
let capeModal, modalCanvas, closeModalButton, modalCapeName, modalCapeId, modalUploaderName, modalSkinToggle, modalPanoramaSelect, modalOverlay, modalActiveUsers;

const defaultSkinPath = "/img/skin.png";
const defaultGalleryPreviewBackgroundColor = 0x1a1a1a;
const defaultModalCanvasBackgroundColor = 0x1a1a1a;
const defaultModalViewerBackgroundColor = 0x2e2e2e;

const CAPES_PER_PAGE = 12;
const API_BASE_URL = "https://api.cookieattack.de:8989";

let allCapes = [];
let filteredAndSortedCapes = [];
let currentPage = 1;
let totalPages = 0;

let capeSearchInput, capeSortBy, capeSortOrder;

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

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
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
    const capesToShow = filteredAndSortedCapes.slice(startIndex, endIndex);

    if (capesToShow.length === 0) {
        const searchVal = capeSearchInput ? capeSearchInput.value : "";
        if (searchVal !== "" || (allCapes.length > 0 && filteredAndSortedCapes.length === 0) ) {
             container.innerHTML = `<p style="color: var(--text-color-dim); text-align: center; width: 100%;">Keine Capes entsprechen deinen Filterkriterien.</p>`;
        } else {
             container.innerHTML = `<p style="color: var(--text-color-dim); text-align: center; width: 100%;">Keine Capes zum Anzeigen gefunden.</p>`;
        }
    } else {
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
            nameP.className = 'cape-preview-name';
            previewDiv.appendChild(nameP);

            const uploaderName = cape.minecraft_name;
            const uploaderP = document.createElement("p");
            uploaderP.textContent = `von ${uploaderName}`;
            uploaderP.className = 'cape-preview-uploader';
            previewDiv.appendChild(uploaderP);

            const activeUsers = cape.active_user_count !== undefined ? cape.active_user_count : 0;
            const activeUsersP = document.createElement("p");
            activeUsersP.className = 'cape-active-users';
            activeUsersP.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="vertical-align: middle; margin-right: 4px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>${activeUsers}`;
            previewDiv.appendChild(activeUsersP);


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
            previewDiv.dataset.activeUsers = activeUsers;

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    skin: defaultSkinPath,
                    background: defaultGalleryPreviewBackgroundColor
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
                    const users = previewDiv.dataset.activeUsers;
                    if (url && id !== undefined && name && uploader) {
                        openCapeModal(id, url, name, uploader, users);
                    } else {
                        console.error("Missing data for modal", previewDiv.dataset);
                        alert("Fehler: Details für dieses Cape konnten nicht geladen werden.");
                    }
                });

            } catch (viewerError) {
                console.error("Error initializing gallery SkinViewer:", viewerError);
                const errorP = document.createElement("p");
                errorP.style.cssText = 'font-size: 0.8em; color: var(--error-color); margin-top: 5px;';
                errorP.textContent = 'Vorschaufehler';
                previewDiv.appendChild(errorP);
                previewDiv.style.opacity = '0.7';
                previewDiv.style.cursor = 'not-allowed';
            }
        });
    }

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
    totalPages = Math.ceil(filteredAndSortedCapes.length / CAPES_PER_PAGE);

    if (totalPages <= 1) {
        controlsContainer.style.display = 'none';
        return;
    }
    controlsContainer.style.display = 'flex';

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
             window.scrollTo({ top: container.offsetTop - 150, behavior: 'smooth' });
        }
    }
}

function applyCapeFiltersAndSorting() {
    const searchTerm = capeSearchInput.value.toLowerCase();
    const sortBy = capeSortBy.value;
    const sortOrder = capeSortOrder.value;

    let tempCapes = [...allCapes];

    if (searchTerm) {
        tempCapes = tempCapes.filter(cape => {
            const capeName = cape.cape_name ? cape.cape_name.toLowerCase() : "";
            const uploaderName = cape.minecraft_name ? cape.minecraft_name.toLowerCase() : "";
            return capeName.includes(searchTerm) || uploaderName.includes(searchTerm);
        });
    }

    tempCapes.sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'cape_name':
                valA = a.cape_name ? a.cape_name.toLowerCase() : "";
                valB = b.cape_name ? b.cape_name.toLowerCase() : "";
                break;
            case 'minecraft_name':
                valA = a.minecraft_name ? a.minecraft_name.toLowerCase() : "";
                valB = b.minecraft_name ? b.minecraft_name.toLowerCase() : "";
                break;
            case 'last_edited':
                valA = new Date(a.last_edited || 0);
                valB = new Date(b.last_edited || 0);
                break;
            case 'active_user_count':
                valA = a.active_user_count !== undefined ? a.active_user_count : 0;
                valB = b.active_user_count !== undefined ? b.active_user_count : 0;
                break;
            case 'cape_id':
            default:
                valA = a.cape_id;
                valB = b.cape_id;
                break;
        }

        if (valA < valB) {
            return sortOrder === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    });

    filteredAndSortedCapes = tempCapes;
    currentPage = 1;
    totalPages = Math.ceil(filteredAndSortedCapes.length / CAPES_PER_PAGE);
    displayCurrentPage();
}

async function fetchAllCapesAndPaginate() {
    const container = document.getElementById("capeContainer");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const controlsContainer = document.getElementById("paginationControls");

    if (!container || !loadingIndicator || !controlsContainer) {
        console.error("Essential elements for pagination not found.");
         if(loadingIndicator) loadingIndicator.innerHTML = `<p style="color: var(--error-color);">Seitenfehler: Wichtige Elemente fehlen.</p>`;
        return;
    }

    loadingIndicator.style.display = 'block';
    container.style.display = 'none';
    controlsContainer.innerHTML = '';

    try {
        const initialRequestBody = {
            sort_by: 'active_user_count',
            order: 'desc',
        };

        const response = await fetch(`${API_BASE_URL}/list_capes_sorted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(initialRequestBody)
        });

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
        
        filteredAndSortedCapes = [...allCapes]; 

        loadingIndicator.style.display = 'none';

        if (allCapes.length === 0) {
            container.innerHTML = `<p style="color: var(--text-color-dim); text-align: center; width: 100%;">Keine Capes zum Anzeigen gefunden.</p>`;
            container.style.display = 'flex';
            if (controlsContainer) controlsContainer.style.display = 'none';
        } else {
            applyCapeFiltersAndSorting();
        }

    } catch (err) {
        console.error("Error fetching or setting up pagination:", err);
        loadingIndicator.style.display = 'none';
        container.innerHTML = `<p style="color: var(--error-color);">Ein Fehler ist aufgetreten: ${err.message || 'Capes konnten nicht geladen werden.'}</p>`;
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
                background: defaultModalViewerBackgroundColor
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
        } catch (e) {
            console.error("Failed to initialize modal SkinViewer:", e);
            if (modalCanvas.parentElement) {
                modalCanvas.parentElement.innerHTML = `<p style='color: var(--error-color);'>3D-Vorschau konnte nicht geladen werden.</p>`;
            }
            modalSkinViewer = null;
        }
    }
}

function openCapeModal(capeId, capeUrl, capeName, uploaderName, activeUsers) {
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
    modalActiveUsers.textContent = activeUsers !== undefined ? activeUsers : "0";

    const modalViewDetailsButton = document.getElementById('modalViewDetailsButton');
    if (modalViewDetailsButton) {
        if (capeId !== undefined && capeId !== null) {
            modalViewDetailsButton.href = `cape-detail.html?id=${capeId}`;
            modalViewDetailsButton.style.display = 'inline-block';
        } else {
            modalViewDetailsButton.href = '#';
            modalViewDetailsButton.style.display = 'none';
        }
    }

    modalSkinToggle.checked = true;
    modalPanoramaSelect.value = 'none';

    const skinUrl = getPlayerSkinUrl(uploaderName);

    modalSkinViewer.loadSkin(skinUrl)
        .then(() => {})
        .catch(err => {
            console.error(`Modal: Failed to load skin from ${skinUrl}:`, err);
            modalSkinViewer.loadSkin(defaultSkinPath)
                .catch(e => console.error("Modal: Failed to load fallback skin:", e));
            modalUploaderName.textContent += " (Skin nicht gefunden)";
        });

    modalSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
        .then(() => {})
        .catch(err => {
            console.error(`Modal: Failed to load cape ${capeUrl}:`, err);
            modalCapeName.textContent += " (Cape-Ladefehler)";
        });

    modalCanvas.style.backgroundColor = 'var(--card-bg-darker)';
    modalSkinViewer.loadPanorama(null);
    modalSkinViewer.background = null;

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
    modalActiveUsers = document.getElementById('modalActiveUsers');
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
                    .then(() => {
                        modalSkinViewer.background = null;
                    })
                    .catch(err => {
                        console.error("Modal: Failed to load panorama:", err);
                        alert("Panorama konnte nicht geladen werden.");
                        modalSkinViewer.loadPanorama(null);
                        modalCanvas.style.backgroundColor = 'var(--card-bg-darker)';
                        modalSkinViewer.background = null;
                        modalPanoramaSelect.value = 'none';
                    });
            } else {
                modalSkinViewer.loadPanorama(null);
                modalCanvas.style.backgroundColor = 'var(--card-bg-darker)';
                modalSkinViewer.background = null;
            }
        });
    }

    capeSearchInput = document.getElementById('capeSearchInput');
    capeSortBy = document.getElementById('capeSortBy');
    capeSortOrder = document.getElementById('capeSortOrder');

    if (capeSearchInput) {
        capeSearchInput.addEventListener('input', debounce(applyCapeFiltersAndSorting, 300));
    }
    if (capeSortBy) {
        capeSortBy.addEventListener('change', applyCapeFiltersAndSorting);
    }
    if (capeSortOrder) {
        capeSortOrder.addEventListener('change', applyCapeFiltersAndSorting);
    }

    fetchAllCapesAndPaginate();
});