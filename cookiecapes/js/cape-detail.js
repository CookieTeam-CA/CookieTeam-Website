const defaultSkinPath = "/img/skin.png";
const API_BASE_URL = "https://api.cookieattack.de:8989";
let mainViewer = null;

let currentSkinSource = defaultSkinPath;
let currentCapeSource = null;
let currentUploaderNameForFetchedMode = null;
let debounceTimeoutSkin;
let debounceTimeoutCape;
const DEBOUNCE_DELAY = 800;

function getCorrectCapeImageUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') return null;
    try {
        let correctedUrl = originalUrl;
        if (correctedUrl.startsWith('http://')) {
            const urlObj = new URL(correctedUrl);
            if (urlObj.protocol === 'http:' && urlObj.hostname === 'api.cookieattack.de' && urlObj.port === '8000') {
                urlObj.protocol = 'https:'; urlObj.port = '8989';
                correctedUrl = urlObj.toString();
            }
        }
        return correctedUrl;
    } catch (e) {
        console.error("Error correcting cape image URL:", originalUrl, e);
        return originalUrl;
    }
}

function getPlayerSkinUrl(minecraftName) {
    if (!minecraftName || typeof minecraftName !== 'string' || !/^[a-zA-Z0-9_]{3,16}$/.test(minecraftName)) {
        return defaultSkinPath;
    }
    return `https://starlightskins.lunareclipse.studio/render/skin/${minecraftName}/default`;
}

function showLoading(message = "Lade...") {
    document.getElementById('loadingMessageGlobal').textContent = message;
    document.getElementById('loadingMessageGlobal').classList.remove('hidden');
    document.getElementById('viewerSection').classList.add('hidden');
    document.getElementById('errorMessageGlobal').classList.add('hidden');
}

function showError(message) {
    document.getElementById('errorMessageGlobal').querySelector('p').textContent = message;
    document.getElementById('errorMessageGlobal').classList.remove('hidden');
    document.getElementById('loadingMessageGlobal').classList.add('hidden');
    document.getElementById('viewerSection').classList.add('hidden');
}

function showViewer() {
    document.getElementById('viewerSection').classList.remove('hidden');
    document.getElementById('loadingMessageGlobal').classList.add('hidden');
    document.getElementById('errorMessageGlobal').classList.add('hidden');
}

function initializeMainViewer() {
    const canvas = document.getElementById('mainViewerCanvas');
    if (!canvas) {
        showError("Fehler: Vorschau-Element (Canvas) nicht gefunden.");
        return false;
    }
    if (!mainViewer) {
        try {
            mainViewer = new skinview3d.SkinViewer({
                canvas: canvas, width: canvas.width, height: canvas.height, background: null
            });
            canvas.style.backgroundColor = 'var(--card-bg-darker)';
            mainViewer.fov = 65; mainViewer.zoom = 0.8;
            mainViewer.globalLight.intensity = 2.5; mainViewer.cameraLight.intensity = 1.0;
            mainViewer.autoRotate = true; mainViewer.autoRotateSpeed = 0.7;
        } catch (e) {
            console.error("Failed to initialize main SkinViewer:", e);
            showError("3D-Vorschau konnte nicht initialisiert werden.");
            return false;
        }
    }
    return true;
}

async function loadSkinToViewer(skinResource) {
    if (!mainViewer) return;
    try {
        currentSkinSource = skinResource;
        if (skinResource instanceof File) {
            const objectURL = URL.createObjectURL(skinResource);
            await mainViewer.loadSkin(objectURL);
            URL.revokeObjectURL(objectURL);
        } else if (typeof skinResource === 'string') {
            await mainViewer.loadSkin(skinResource);
        } else {
             await mainViewer.loadSkin(null);
        }
    } catch (error) {
        console.error("Error loading skin to viewer:", error, skinResource);
        currentSkinSource = defaultSkinPath;
        await mainViewer.loadSkin(defaultSkinPath);
    }
}

async function loadCapeToViewer(capeResource, isElytra = false) {
    if (!mainViewer) return;
    try {
        currentCapeSource = capeResource;
        if (capeResource instanceof File) {
            const objectURL = URL.createObjectURL(capeResource);
            await mainViewer.loadCape(objectURL, { backEquipment: isElytra ? "elytra" : "cape" });
            URL.revokeObjectURL(objectURL);
        } else if (typeof capeResource === 'string') {
            await mainViewer.loadCape(capeResource, { backEquipment: isElytra ? "elytra" : "cape" });
        } else {
             await mainViewer.loadCape(null);
        }
    } catch (error) {
        console.error("Error loading cape/elytra to viewer:", error, capeResource);
        currentCapeSource = null;
         await mainViewer.loadCape(null);
    }
}

function setupSharedControls() {
    if (!mainViewer) return;

    const rotationToggle = document.getElementById('rotationToggle');
    const animationSelect = document.getElementById('animationSelect');
    const elytraToggle = document.getElementById('elytraToggle');
    const skinVisibleToggle = document.getElementById('skinVisibleToggle');
    const panoramaSelect = document.getElementById('panoramaSelect');
    const canvas = document.getElementById('mainViewerCanvas');

    rotationToggle.checked = mainViewer.autoRotate;
    animationSelect.value = 'idle';
    if (mainViewer.animation instanceof skinview3d.WalkingAnimation) animationSelect.value = 'walking';
    else if (mainViewer.animation instanceof skinview3d.RunningAnimation) animationSelect.value = 'running';
    else if (mainViewer.animation instanceof skinview3d.FlyingAnimation) animationSelect.value = 'flying';
    
    elytraToggle.checked = false; 
    skinVisibleToggle.checked = true;
    panoramaSelect.value = 'none';

    rotationToggle.onchange = () => { if (mainViewer) mainViewer.autoRotate = rotationToggle.checked; };

    animationSelect.onchange = () => {
        if (!mainViewer) return;
        const selectedAnimation = animationSelect.value;
        switch (selectedAnimation) {
            case 'idle':    mainViewer.animation = new skinview3d.IdleAnimation(); break;
            case 'walking': mainViewer.animation = new skinview3d.WalkingAnimation(); break;
            case 'running': mainViewer.animation = new skinview3d.RunningAnimation(); break;
            case 'flying':  mainViewer.animation = new skinview3d.FlyingAnimation(); break;
            default:        mainViewer.animation = new skinview3d.IdleAnimation();
        }
    };
    animationSelect.dispatchEvent(new Event('change'));

    elytraToggle.onchange = () => {
        loadCapeToViewer(currentCapeSource, elytraToggle.checked);
    };

    skinVisibleToggle.onchange = () => {
        if (skinVisibleToggle.checked) {
            let skinToLoad = defaultSkinPath;
            if (document.getElementById('assetSourceControls').classList.contains('hidden') && currentUploaderNameForFetchedMode) {
                 skinToLoad = getPlayerSkinUrl(currentUploaderNameForFetchedMode);
            } else {
                 skinToLoad = currentSkinSource || defaultSkinPath;
            }
            loadSkinToViewer(skinToLoad);
        } else {
            loadSkinToViewer(null);
        }
    };

    panoramaSelect.onchange = () => {
        if (!mainViewer || !canvas) return;
        const selection = panoramaSelect.value;
        const panoramaPath = selection === 'panorama1' ? 'img/panorama1.png' : null;

        if (panoramaPath) {
            mainViewer.loadPanorama(panoramaPath).then(() => mainViewer.background = null)
                .catch(err => {
                    console.error("Failed to load panorama:", err); alert("Panorama konnte nicht geladen werden.");
                    mainViewer.loadPanorama(null); canvas.style.backgroundColor = 'var(--card-bg-darker)';
                    mainViewer.background = null; panoramaSelect.value = 'none';
                });
        } else {
            mainViewer.loadPanorama(null); canvas.style.backgroundColor = 'var(--card-bg-darker)';
            mainViewer.background = null;
        }
    };
}

async function setupFetchedCapeMode(capeIdToFind) {
    document.getElementById('pageTitle').textContent = "Lade Cape Details...";
    document.getElementById('fetchedCapeInfoDisplay').classList.remove('hidden');
    document.getElementById('assetSourceControls').classList.add('hidden');
    document.getElementById('sourceControlsDivider').classList.add('hidden');
    document.getElementById('backLink').href = "capes.html";
    document.getElementById('backLink').textContent = "« Zurück zur Galerie";

    try {
        const allCapesResponse = await fetch(`${API_BASE_URL}/list_capes`);
        if (!allCapesResponse.ok) throw new Error(`Cape-Liste nicht erreichbar: ${allCapesResponse.status}`);
        const allCapesResult = await allCapesResponse.json();
        const foundCape = (allCapesResult.capes || []).find(c => c.cape_id == capeIdToFind);

        if (!foundCape) throw new Error(`Cape mit ID ${capeIdToFind} nicht gefunden.`);

        const capeName = foundCape.cape_name || "Unbenanntes Cape";
        currentUploaderNameForFetchedMode = foundCape.minecraft_name || "Unbekannt";
        const fetchedCapeUrl = getCorrectCapeImageUrl(foundCape.cape_image_url);
        const fetchedSkinUrl = getPlayerSkinUrl(currentUploaderNameForFetchedMode);

        if (!fetchedCapeUrl) throw new Error("Cape Bild-URL ist ungültig.");

        document.getElementById('pageTitle').textContent = capeName;
        document.title = `CookieCapes - ${capeName}`;
        document.getElementById('capeIdDetail').textContent = capeIdToFind;
        document.getElementById('uploaderNameDetail').textContent = currentUploaderNameForFetchedMode;

        await loadSkinToViewer(fetchedSkinUrl);
        await loadCapeToViewer(fetchedCapeUrl, document.getElementById('elytraToggle').checked);

        setupSharedControls();
        showViewer();

    } catch (error) {
        console.error("Error in fetched cape mode:", error);
        showError(error.message);
    }
}

async function attemptLoadSkinByName(playerName, statusElement) {
    if (playerName) {
        statusElement.textContent = `Lade Skin für: ${playerName}...`;
        statusElement.style.color = 'var(--text-color-dimmer)';
        const skinUrl = getPlayerSkinUrl(playerName);
        try {
            const skinResponse = await fetch(skinUrl);
            if (!skinResponse.ok || !skinResponse.headers.get('content-type')?.startsWith('image/')) {
                 throw new Error("Skin nicht gefunden oder ungültig.");
            }
            await loadSkinToViewer(skinUrl); 
            statusElement.textContent = `Skin für ${playerName} geladen.`;
            statusElement.style.color = 'var(--success-color)';
        } catch (e) {
            console.warn(`Failed to load skin for ${playerName}: ${e.message}`);
            statusElement.textContent = `Skin für ${playerName} nicht gefunden.`;
            statusElement.style.color = 'var(--error-color)';
            await loadSkinToViewer(defaultSkinPath);
        }
    } else {
        statusElement.textContent = "";
        await loadSkinToViewer(defaultSkinPath);
    }
}

async function attemptLoadCapeByName(playerName, statusElement) {
    if (playerName) {
        statusElement.textContent = `Lade Cape für: ${playerName}...`;
        statusElement.style.color = 'var(--text-color-dimmer)';
        try {
            const playerResponse = await fetch(`${API_BASE_URL}/get_player?identifier=${playerName}`);
            if (!playerResponse.ok) {
                throw new Error(`Spieler "${playerName}" nicht in DB gefunden.`);
            }
            const playerData = await playerResponse.json();
            if (playerData.banned) {
                throw new Error(`Spieler "${playerName}" ist gebannt.`);
            }
            if (playerData.cape_id === null || playerData.cape_id === undefined) { // KORREKTUR HIER
                throw new Error(`Spieler "${playerName}" hat kein aktives Cape.`);
            }

            const capeResponse = await fetch(`${API_BASE_URL}/get_cape?cape_id=${playerData.cape_id}`); // KORREKTUR HIER
            if (!capeResponse.ok) {
                throw new Error(`Cape ID ${playerData.cape_id} nicht gefunden.`); // KORREKTUR HIER
            }
            const capeData = await capeResponse.json();
            const capeUrl = getCorrectCapeImageUrl(capeData.cape_image_url);

            if (capeUrl) {
                await loadCapeToViewer(capeUrl, document.getElementById('elytraToggle').checked);
                statusElement.textContent = `Cape von ${playerName} geladen.`;
                statusElement.style.color = 'var(--success-color)';
            } else {
                throw new Error("Ungültige Cape-URL vom API erhalten.");
            }
        } catch (error) {
            console.error(`Error loading cape for ${playerName}:`, error);
            statusElement.textContent = error.message;
            statusElement.style.color = 'var(--error-color)';
            await loadCapeToViewer(null);
        }
    } else {
        statusElement.textContent = "";
        await loadCapeToViewer(null);
    }
}

function setupPlaygroundMode() {
    document.getElementById('pageTitle').textContent = 'Skin & Cape Vorschau';
    document.getElementById('fetchedCapeInfoDisplay').classList.add('hidden');
    document.getElementById('assetSourceControls').classList.remove('hidden');
    document.getElementById('sourceControlsDivider').classList.remove('hidden');
    document.getElementById('backLink').href = "index.html";
    document.getElementById('backLink').textContent = "« Zurück zur Startseite";

    loadSkinToViewer(defaultSkinPath);
    loadCapeToViewer(null);

    const skinUploadInput = document.getElementById('skinUpload');
    const skinFileNameSpan = document.getElementById('skinFileName');
    const skinNameInput = document.getElementById('skinNameInput');
    const skinLoadStatus = document.getElementById('skinLoadStatus');

    const capeUploadInput = document.getElementById('capeUpload');
    const capeFileNameSpan = document.getElementById('capeFileName');
    const capeNameInput = document.getElementById('capeNameInput');
    const capeLoadStatus = document.getElementById('capeLoadStatus');

    skinUploadInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "image/png") {
            skinNameInput.value = ""; 
            skinLoadStatus.textContent = "";
            skinFileNameSpan.textContent = file.name;
            loadSkinToViewer(file);
        } else {
            skinFileNameSpan.textContent = file ? "Ungültiger Typ" : skinFileNameSpan.textContent;
        }
    };

    skinNameInput.addEventListener('input', () => {
        clearTimeout(debounceTimeoutSkin);
        debounceTimeoutSkin = setTimeout(() => {
            const playerName = skinNameInput.value.trim();
            if (playerName.length >= 3) {
                skinUploadInput.value = ""; 
                skinFileNameSpan.textContent = "Kein Skin ausgewählt";
                attemptLoadSkinByName(playerName, skinLoadStatus);
            } else if (!playerName) {
                skinLoadStatus.textContent = "";
                loadSkinToViewer(defaultSkinPath);
            } else {
                skinLoadStatus.textContent = "Name zu kurz (min. 3 Zeichen)";
                 skinLoadStatus.style.color = 'var(--text-color-dimmer)';
            }
        }, DEBOUNCE_DELAY);
    });

    capeUploadInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === "image/png") {
            capeNameInput.value = ""; 
            capeLoadStatus.textContent = "";
            capeFileNameSpan.textContent = file.name;
            loadCapeToViewer(file, document.getElementById('elytraToggle').checked);
        } else {
            capeFileNameSpan.textContent = file ? "Ungültiger Typ" : capeFileNameSpan.textContent;
        }
    };
    
    capeNameInput.addEventListener('input', () => {
        clearTimeout(debounceTimeoutCape);
        debounceTimeoutCape = setTimeout(() => {
            const playerName = capeNameInput.value.trim();
            if (playerName.length >= 3) {
                capeUploadInput.value = "";
                capeFileNameSpan.textContent = "Kein Cape ausgewählt";
                attemptLoadCapeByName(playerName, capeLoadStatus);
            } else if (!playerName) {
                capeLoadStatus.textContent = "";
                loadCapeToViewer(null);
            } else {
                 capeLoadStatus.textContent = "Name zu kurz (min. 3 Zeichen)";
                 capeLoadStatus.style.color = 'var(--text-color-dimmer)';
            }
        }, DEBOUNCE_DELAY);
    });
    
    setupSharedControls();
    showViewer();
}

document.addEventListener('DOMContentLoaded', () => {
    showLoading();

    if (!initializeMainViewer()) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const capeId = urlParams.get('id');

    if (capeId) {
        setupFetchedCapeMode(capeId);
    } else {
        setupPlaygroundMode();
    }

    window.addEventListener("scroll", () => {
        const header = document.querySelector("header");
        if (header) header.classList.toggle("floating", window.scrollY > 50);
    });
});