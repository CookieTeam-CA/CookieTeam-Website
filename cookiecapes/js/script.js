let modalSkinViewer = null;
let capeModal, modalCanvas, closeModalButton, modalCapeName, modalCapeId, modalSkinToggle, modalPanoramaSelect, modalOverlay;
const defaultSkinPath = "/img/skin.png";
const defaultModalBackgroundColor = 0x2a2a3a;

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

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

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

async function fetchRandomCapes() {
    try {
        const response = await fetch("https://api.cookieattack.de:8989/list_capes");

        if (!response.ok) {
            const text = await response.text();
            console.error("API Error (fetchRandomCapes):", response.status, text);
            const container = document.getElementById("capeContainer");
            if(container) container.innerHTML = '<p style="color: #ff6b6b;">Fehler beim Laden der Capes.</p>';
            return;
        }

        const result = await response.json();
        const capes = result.capes || [];
        const validCapes = capes.filter(cape => cape.cape_image_url && cape.cape_image_url.trim() !== "");

        const container = document.getElementById("capeContainer");
        if (!container) {
            console.error("Cape container element 'capeContainer' not found!");
            return;
        }

        if (validCapes.length === 0) {
             console.warn("No valid capes with images found (fetchRandomCapes).");
             if(container) container.innerHTML = '<p style="color: #ccc;">Keine Capes zum Anzeigen gefunden.</p>';
             return;
        }

        const randomCapes = validCapes.sort(() => 0.5 - Math.random()).slice(0, 4);

        container.innerHTML = "";

        randomCapes.forEach((cape) => {
            const previewDiv = document.createElement("div");
            previewDiv.className = "cape-preview";

            const canvas = document.createElement("canvas");
            canvas.width = 150;
            canvas.height = 200;
            previewDiv.appendChild(canvas);

            const nameP = document.createElement("p");
            const capeNameText = cape.cape_name || "Unbenanntes Cape";
            nameP.textContent = capeNameText;
            previewDiv.appendChild(nameP);

            container.appendChild(previewDiv);

            const correctedImageUrl = getCorrectCapeImageUrl(cape.cape_image_url);
            const capeId = cape.cape_id;
            previewDiv.dataset.capeId = capeId;
            previewDiv.dataset.capeUrl = correctedImageUrl;
            previewDiv.dataset.capeName = capeNameText;

            if (!correctedImageUrl) {
                console.warn(`Could not generate correct image URL for cape ID ${cape.cape_id} (random)`);
                previewDiv.innerHTML += '<p style="font-size: 0.8em; color: red;">Bild ungültig</p>';
                return;
            }

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas,
                    width: canvas.width,
                    height: canvas.height,
                    skin: defaultSkinPath,
                    background: 0x181818
                });

                viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                      .catch(err => console.error(`Failed to load cape ${correctedImageUrl} for random preview:`, err));

                viewer.fov = 70;
                viewer.zoom = 0.9;
                viewer.globalLight.intensity = 3;
                viewer.cameraLight.intensity = 3;
                viewer.autoRotate = true;
                viewer.autoRotateSpeed = 0.8;
                 previewDiv.addEventListener('click', () => {
                    const id = previewDiv.dataset.capeId;
                    const url = previewDiv.dataset.capeUrl;
                    const name = previewDiv.dataset.capeName;

                    if (url && id !== undefined) {
                        openCapeModal(id, url, name);
                    } else {
                        console.error("Missing data needed to open modal", previewDiv.dataset);
                        alert("Fehler: Details für dieses Cape konnten nicht geladen werden.");
                    }
                 });

            } catch (viewerError) {
                 console.error("Error initializing random gallery SkinViewer:", viewerError);
                 previewDiv.innerHTML = `<p>${capeNameText}</p><p style="font-size: 0.8em; color: red;">Vorschaufehler</p>`;
            }
        });

    } catch (err) {
        console.error("Error fetching or displaying random capes:", err);
        const container = document.getElementById("capeContainer");
        if(container) container.innerHTML = '<p style="color: #ff6b6b;">Fehler beim Laden der Capes.</p>';
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

/**
 * Opens the cape detail modal and loads the specified cape.
 * @param {string|number} capeId The ID of the cape.
 * @param {string} capeUrl The URL of the cape image.
 * @param {string} capeName The name of the cape.
 */
function openCapeModal(capeId, capeUrl, capeName) {
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

    modalSkinToggle.checked = true;
    modalPanoramaSelect.value = 'none';

    modalSkinViewer.loadSkin(defaultSkinPath)
        .catch(err => console.error("Modal: Failed to load default skin:", err));

    modalSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
        .then(() => console.log(`Modal: Loaded cape ${capeId} from ${capeUrl}`))
        .catch(err => {
            console.error(`Modal: Failed to load cape ${capeUrl}:`, err);
            modalCapeName.textContent += " (Ladefehler)";
        });

    modalSkinViewer.loadPanorama(null);
    modalSkinViewer.background = defaultModalBackgroundColor;

    modalSkinViewer.autoRotate = true;
    if (modalSkinViewer.animation) modalSkinViewer.animation.paused = false;

    capeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCapeModal() {
    if (!capeModal || !modalSkinViewer) return;

    capeModal.classList.add('hidden');
    document.body.style.overflow = '';

    modalSkinViewer.autoRotate = false;
    if (modalSkinViewer.animation) modalSkinViewer.animation.paused = true;
}


document.addEventListener('DOMContentLoaded', () => {
    fetchRandomCapes();

    capeModal = document.getElementById('capeModal');
    modalCanvas = document.getElementById('modalCanvas');
    closeModalButton = document.getElementById('closeModalButton');
    modalCapeName = document.getElementById('modalCapeName');
    modalCapeId = document.getElementById('modalCapeId');
    modalSkinToggle = document.getElementById('modalSkinToggle');
    modalPanoramaSelect = document.getElementById('modalPanoramaSelect');
    modalOverlay = capeModal ? capeModal.querySelector('.modal-overlay') : null;

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeCapeModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeCapeModal);
    }
    if (modalSkinToggle) {
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
    }
    if (modalPanoramaSelect) {
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

    const capeUploadSection = document.getElementById('capeUpload');
    if (!capeUploadSection) {
        console.log("Cape upload section not found, skipping form initialization.");
        return;
    }

    const formContainer = document.getElementById('multiStepForm');
    const navigationContainer = document.getElementById('stepNavigation');
    const successMessageContainer = document.getElementById('successMessage');
    const limitMessageContainer = document.getElementById('limitMessage');
    const wizardContainer = document.querySelector('.step-wizard-container');

    const steps = document.querySelectorAll('.form-step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');
    const stepTitle = document.getElementById('stepTitle');

    const minecraftNameInput = document.getElementById('minecraftName');
    const capeNameInput = document.getElementById('capeName');
    const capeUploadInput = document.getElementById('capeUploadInput');

    const capeFileNameDisplay = document.getElementById('capeFileName');
    const previewMinecraftName = document.getElementById('previewMinecraftName');
    const previewCapeName = document.getElementById('previewCapeName');

    const minecraftNameFeedback = document.getElementById('minecraftNameFeedback');
    const capeNameFeedback = document.getElementById('capeNameFeedback');
    const capeFileFeedback = document.getElementById('capeFileFeedback');
    const nameCheckLoader = document.getElementById('nameCheckLoader');

    const previewCanvas = document.getElementById("skin_preview_canvas");
    let previewSkinViewer = null;

    let currentStep = 1;
    const totalSteps = steps.length;
    const formData = {
        minecraftName: '',
        capeName: '',
        skinFile: null,
        capeFile: null,
        fetchedSkinUrl: null,
        nameValidated: false
    };

    const uploadCookie = getCookie("capeUploadedToday");
    if (uploadCookie) {
        if (formContainer) formContainer.style.display = 'none';
        if (navigationContainer) navigationContainer.style.display = 'none';
        if (limitMessageContainer) limitMessageContainer.style.display = 'block';
        if (wizardContainer) wizardContainer.style.minHeight = '200px';
        if (stepTitle) stepTitle.textContent = "Limit erreicht";
        if (progressBar) progressBar.style.width = '100%';
        console.log("Daily upload limit reached.");
        return;
    } else {
       if (limitMessageContainer) limitMessageContainer.style.display = 'none';
    }

    function initializePreviewViewer() {
        if (!previewSkinViewer && previewCanvas) {
             try {
                previewSkinViewer = new skinview3d.SkinViewer({
                    canvas: previewCanvas,
                    width: previewCanvas.width,
                    height: previewCanvas.height,
                    skin: defaultSkinPath,
                    background: 0x00000000
                });
                previewSkinViewer.fov = 60;
                previewSkinViewer.zoom = 0.85;
                previewSkinViewer.globalLight.intensity = 3;
                previewSkinViewer.cameraLight.intensity = 3;
                previewSkinViewer.autoRotate = true;
                previewSkinViewer.autoRotateSpeed = 0.5;
                previewSkinViewer.animation = new skinview3d.WalkingAnimation();
                previewSkinViewer.animation.speed = 0.4;

                console.log("Form Preview SkinViewer initialized.");
            } catch (e) {
                console.error("Failed to initialize form preview SkinViewer:", e);
                if (previewCanvas.parentElement) {
                    previewCanvas.parentElement.innerHTML = "<p style='color: #ff6b6b;'>Vorschau konnte nicht geladen werden.</p>";
                }
            }
        }
    }

    function updateButtons() {
        if (!prevBtn || !nextBtn || !submitBtn) return;
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';

        nextBtn.disabled = (currentStep === 1 && !formData.nameValidated);

        updateProgressBar();
        updateStepTitle();
    }

    function updateProgressBar() {
        if (!progressBar) return;
        const progress = totalSteps > 1 ? ((currentStep -1) / (totalSteps - 1)) * 100 : 0;
        progressBar.style.width = `${progress}%`;
    }

     function updateStepTitle() {
         if (!stepTitle) return;
         const titles = [
            "Schritt 1: Dein Minecraft-Name",
            "Schritt 2: Name des Capes",
            "Schritt 3: Cape Hochladen",
            "Schritt 4: Vorschau & Bestätigung"
         ];
         const titleText = titles[currentStep - 1] || `Schritt ${currentStep}`;
         stepTitle.style.opacity = 0;
         setTimeout(() => {
             stepTitle.textContent = titleText;
             stepTitle.style.opacity = 1;
         }, 300);
    }

    function showStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > totalSteps) return;

        const currentActive = document.querySelector('.form-step.active');
        if (currentActive) {
            currentActive.classList.add('exiting');
             setTimeout(() => {
                currentActive.classList.remove('active', 'exiting');
             }, 500);
        }

        setTimeout(() => {
            const nextStep = document.getElementById(`step-${stepNumber}`);
            if (nextStep) {
                nextStep.classList.add('active');
                currentStep = stepNumber;
                updateButtons();

                if (currentStep === totalSteps) {
                    initializePreviewViewer();
                    updatePreview();
                }
            }
        }, 50);
    }

    async function checkMinecraftName(name) {
        formData.nameValidated = false;
        formData.fetchedSkinUrl = null;
        updateButtons();

        if (!name || !/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
             if(name && name.length >= 3) {
                minecraftNameFeedback.textContent = 'Ungültiges Format (3-16 Zeichen, A-Z, a-z, 0-9, _).';
                minecraftNameFeedback.className = 'input-feedback';
             } else if (!name) {
                 minecraftNameFeedback.textContent = '';
             } else {
                 minecraftNameFeedback.textContent = '';
             }
            nameCheckLoader.style.display = 'none';
            return;
        }

        minecraftNameFeedback.textContent = 'Überprüfe Namen...';
        minecraftNameFeedback.className = 'input-feedback checking';
        nameCheckLoader.style.display = 'block';

        const apiUrl = `https://starlightskins.lunareclipse.studio/render/skin/${name}/default`;
        console.log("Debounced Check - Checking Starlight API:", apiUrl);

        try {
            const response = await fetch(apiUrl);

            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                console.log("Debounced Check - Success (Image found)");
                minecraftNameFeedback.textContent = 'Minecraft-Name gültig!';
                minecraftNameFeedback.className = 'input-feedback success';
                formData.minecraftName = name;
                formData.fetchedSkinUrl = apiUrl;
                formData.nameValidated = true;
            } else {
                 console.log("Debounced Check - Not an image, checking for JSON error");
                 let errorJson = null;
                 try {
                    errorJson = await response.clone().json();
                 } catch (e) { /* Ignore if response isn't valid JSON */ }

                 if (errorJson && errorJson.error === "Unknown player username/uuid.") {
                    minecraftNameFeedback.textContent = 'Minecraft-Name nicht gefunden.';
                    minecraftNameFeedback.className = 'input-feedback';
                 } else {
                    minecraftNameFeedback.textContent = 'Fehler bei der Namensüberprüfung.';
                    minecraftNameFeedback.className = 'input-feedback';
                    console.error("Debounced Check - Unknown error:", response.status, errorJson);
                 }
                 formData.fetchedSkinUrl = null;
                 formData.minecraftName = name;
            }
        } catch (error) {
            console.error("Debounced Check - Network error:", error);
            minecraftNameFeedback.textContent = 'Fehler bei der Namensüberprüfung (Netzwerk).';
            minecraftNameFeedback.className = 'input-feedback';
            formData.fetchedSkinUrl = null;
            formData.minecraftName = name;
        } finally {
            nameCheckLoader.style.display = 'none';
            updateButtons();
        }
    }
    const debouncedCheckMinecraftName = debounce(checkMinecraftName, 500);


    function validateStep(step) {
        let isValid = true;
        clearFeedback();

        if (step === 1) {
             const name = minecraftNameInput ? minecraftNameInput.value.trim() : '';
             isValid = false;
            if (!name) {
                 if (minecraftNameFeedback) minecraftNameFeedback.textContent = 'Bitte gib deinen Minecraft-Namen ein.';
            } else if (!/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
                 if (minecraftNameFeedback) minecraftNameFeedback.textContent = 'Ungültiges Format (3-16 Zeichen, A-Z, a-z, 0-9, _).';
            } else if (!formData.nameValidated) {
                 if (minecraftNameFeedback && (minecraftNameFeedback.textContent === '' || minecraftNameFeedback.textContent.includes('Überprüfe'))) {
                    minecraftNameFeedback.textContent = 'Bitte warte auf die Namensüberprüfung oder korrigiere den Namen.';
                 }
            } else {
                 isValid = true;
            }
        } else if (step === 2) {
             isValid = false;
             const capeNameValue = capeNameInput ? capeNameInput.value.trim() : '';
             if (!capeNameValue) {
                 if (capeNameFeedback) capeNameFeedback.textContent = 'Bitte gib einen Namen für das Cape ein.';
             } else if (capeNameValue.length > 20) {
                 if (capeNameFeedback) capeNameFeedback.textContent = 'Der Cape-Name darf maximal 20 Zeichen lang sein.';
              } else {
                 formData.capeName = capeNameValue;
                 isValid = true;
             }
        } else if (step === 3) {
            isValid = false;
            if (!formData.capeFile) {
                if (capeFileFeedback) capeFileFeedback.textContent = 'Bitte wähle eine Cape-Datei (PNG) aus.';
            } else {
                isValid = true;
            }
        }
        console.log(`ValidateStep result for step ${step}:`, isValid);
        return isValid;
    }

    function clearFeedback() {
        if (minecraftNameFeedback) {
            minecraftNameFeedback.textContent = '';
            minecraftNameFeedback.className = 'input-feedback';
        }
        if (capeNameFeedback) capeNameFeedback.textContent = '';
        if (capeFileFeedback) capeFileFeedback.textContent = '';
        if (nameCheckLoader) nameCheckLoader.style.display = 'none';
    }

    function updatePreview() {
         if (!previewSkinViewer) return;

        if (previewMinecraftName) previewMinecraftName.textContent = formData.minecraftName || 'Nicht angegeben';
        if (previewCapeName) previewCapeName.textContent = formData.capeName || 'Nicht angegeben';

        let skinSource = formData.fetchedSkinUrl || defaultSkinPath;

        previewSkinViewer.loadSkin(skinSource).catch(err => {
             console.error("Error loading skin into form preview:", skinSource, err);
             if (skinSource !== defaultSkinPath) {
                 previewSkinViewer.loadSkin(defaultSkinPath);
             }
         });

        if (formData.capeFile) {
            const capeUrl = URL.createObjectURL(formData.capeFile);
             previewSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
               .then(() => URL.revokeObjectURL(capeUrl))
               .catch(err => {
                   console.error("Error loading cape into form preview:", err);
                   URL.revokeObjectURL(capeUrl);
                   if (capeFileFeedback) capeFileFeedback.textContent = "Fehler beim Laden der Cape-Vorschau.";
               });
        } else {
            previewSkinViewer.loadCape(null);
        }
    }

    if (minecraftNameInput) {
        minecraftNameInput.addEventListener('input', () => {
             const name = minecraftNameInput.value.trim();
            if (name && !/^[a-zA-Z0-9_]{1,16}$/.test(name)) {
                 minecraftNameFeedback.textContent = 'Ungültige Zeichen oder Name zu lang.';
                 minecraftNameFeedback.className = 'input-feedback';
                 formData.nameValidated = false;
                 updateButtons();
                 nameCheckLoader.style.display = 'none';
                 return;
             }
             else if (name.length > 0 && name.length < 3) {
                 minecraftNameFeedback.textContent = 'Name muss mindestens 3 Zeichen lang sein.';
                 minecraftNameFeedback.className = 'input-feedback';
                 formData.nameValidated = false;
                 updateButtons();
                 nameCheckLoader.style.display = 'none';
                 return;
             }
             else {
                  if(minecraftNameFeedback.textContent.includes('Ungültige Zeichen') || minecraftNameFeedback.textContent.includes('mindestens 3 Zeichen')) {
                      minecraftNameFeedback.textContent = '';
                  }
             }

            formData.nameValidated = false;
            updateButtons();

            if (name.length >= 3) {
                 debouncedCheckMinecraftName(name);
            } else {
                if (!minecraftNameFeedback.textContent.includes('mindestens 3 Zeichen')) {
                     minecraftNameFeedback.textContent = '';
                }
                minecraftNameFeedback.className = 'input-feedback';
                nameCheckLoader.style.display = 'none';
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                showStep(currentStep + 1);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });
    }

    if (capeUploadInput) {
         capeUploadInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file && file.type === "image/png") {
                formData.capeFile = file;
                if (capeFileNameDisplay) capeFileNameDisplay.textContent = `Cape: ${file.name}`;
                if (capeFileFeedback) capeFileFeedback.textContent = '';
                if (currentStep === totalSteps) {
                   updatePreview();
                }
            } else {
                formData.capeFile = null;
                if (capeFileNameDisplay) capeFileNameDisplay.textContent = '';
                 if (file && capeFileFeedback) {
                     capeFileFeedback.textContent = "Ungültiger Dateityp. Bitte PNG auswählen.";
                 } else if (capeFileFeedback) {
                     capeFileFeedback.textContent = '';
                 }
                 if (currentStep === totalSteps && previewSkinViewer) {
                     previewSkinViewer.loadCape(null);
                 }
            }
        });

        const fileLabel = document.querySelector('label[for="capeUploadInput"]');
        if (fileLabel) {
            fileLabel.addEventListener('click', () => capeUploadInput.click());
        }
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
             if (currentStep !== totalSteps || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
                 alert("Bitte fülle alle erforderlichen Felder korrekt aus und stelle sicher, dass der Minecraft-Name gültig ist.");
                 if (!validateStep(1)) showStep(1);
                 else if (!validateStep(2)) showStep(2);
                 else if (!validateStep(3)) showStep(3);
                 return;
             }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Lade hoch...';

            const apiFormData = new FormData();
            apiFormData.append('minecraft_name', formData.minecraftName);
            apiFormData.append('cape_name', formData.capeName);
            if (formData.capeFile) {
                 apiFormData.append('cape', formData.capeFile, formData.capeFile.name);
            } else {
                console.error("Submit button clicked but cape file is missing.");
                alert("Fehler: Cape-Datei fehlt.");
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cape Hochladen';
                return;
            }

            const workerUrl = 'https://cloudcookieapi.leonmt12345.workers.dev/web_add_cape';

            try {
                 const response = await fetch(workerUrl, {
                     method: 'POST',
                     body: apiFormData
                 });

                let result = {};
                try { result = await response.json(); }
                catch (jsonError) {
                    console.warn("Could not parse JSON response:", jsonError);
                    if (!response.ok) {
                        result = { detail: `Serverfehler: ${response.status} ${response.statusText}`};
                    }
                }

                if (response.ok) {
                     setCookie("capeUploadedToday", "true", 1);
                     if (formContainer) formContainer.style.display = 'none';
                     if (navigationContainer) navigationContainer.style.display = 'none';
                     if (successMessageContainer) successMessageContainer.style.display = 'block';
                     if (stepTitle) stepTitle.textContent = "Fertig!";
                     if (progressBar) progressBar.style.width = '100%';
                     console.log(`Cape '${formData.capeName}' uploaded successfully! ID: ${result.cape_id || 'N/A'}`);
                     fetchRandomCapes();
                } else {
                     const errorDetail = result.detail || `Fehler ${response.status}`;
                     alert(`Fehler beim Hochladen: ${errorDetail}`);
                     submitBtn.disabled = false;
                     submitBtn.textContent = 'Cape Hochladen';
                }
            } catch (error) {
                console.error("Upload Network Error:", error);
                alert(`Ein Netzwerkfehler ist aufgetreten: ${error.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cape Hochladen';
            }
        });
    }

    updateButtons();
});