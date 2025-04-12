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

/**
 * Sets a cookie.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value of the cookie.
 * @param {number} days - The number of days until the cookie expires (sets expiry to end of current day if 1).
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

/**
 * Gets a cookie value by name.
 * @param {string} name - The name of the cookie.
 * @returns {string|null} The cookie value or null if not found.
 */
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

/**
 * Erases a cookie by name.
 * @param {string} name - The name of the cookie to erase.
 */
function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

/**
 * Debounce function: Limits the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Constructs the correct HTTPS image URL for a given original URL from the API.
 * @param {string} originalUrl - The URL received from the API (e.g., http://...:8000/capes/1.png)
 * @returns {string|null} The corrected HTTPS URL or null if the original URL is invalid.
 */
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

            const name = document.createElement("p");
            name.textContent = cape.cape_name || "Unbenanntes Cape";
            previewDiv.appendChild(name);

            container.appendChild(previewDiv);

            const correctedImageUrl = getCorrectCapeImageUrl(cape.cape_image_url);

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
                    skin: "/img/skin.png",
                    background: 0x2a2a3a
                });

                viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                      .catch(err => console.error(`Failed to load cape ${correctedImageUrl} for random preview:`, err));

                viewer.fov = 70;
                viewer.zoom = 0.9;
                viewer.globalLight.intensity = 3;
                viewer.cameraLight.intensity = 3;
                viewer.autoRotate = true;
                viewer.autoRotateSpeed = 0.8;
                viewer.animation = new skinview3d.WalkingAnimation();
                viewer.animation.speed = 0.5;

                 previewDiv.addEventListener('click', () => {
                     if (previewSkinViewer) {
                         console.log(`Loading random cape into main preview: ${correctedImageUrl}`);
                         previewSkinViewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                             .catch(err => console.error(`Failed to load cape ${correctedImageUrl} into main preview:`, err));
                     } else {
                          console.warn("Main preview viewer (previewSkinViewer) not found when clicking random cape.");
                     }
                 });

            } catch (viewerError) {
                 console.error("Error initializing random gallery SkinViewer:", viewerError);
                 previewDiv.innerHTML = `<p>Vorschaufehler für ${cape.cape_name || 'Cape'}</p>`;
            }
        });

    } catch (err) {
        console.error("Error fetching or displaying random capes:", err);
        const container = document.getElementById("capeContainer");
        if(container) container.innerHTML = '<p style="color: #ff6b6b;">Fehler beim Laden der Capes.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchRandomCapes();

    const capeUpload = document.getElementById('capeUpload');
    if (!capeUpload) {
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
    const skinUploadInput = document.getElementById('skinUploadInput');
    const capeUploadInput = document.getElementById('capeUploadInput');

    const skinFileNameDisplay = document.getElementById('skinFileName');
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
                    skin: "/img/skin.png",
                    background: 0x00000000
                });
                previewSkinViewer.fov = 60;
                previewSkinViewer.zoom = 0.85;
                previewSkinViewer.globalLight.intensity = 3;
                previewSkinViewer.cameraLight.intensity = 3;
                previewSkinViewer.autoRotate = true;
                previewSkinViewer.autoRotateSpeed = 1.2;
                previewSkinViewer.animation = new skinview3d.WalkingAnimation();
                previewSkinViewer.animation.speed = 0.7;
            } catch (e) {
                console.error("Failed to initialize main preview SkinViewer:", e);
                if (previewCanvas.parentElement) {
                    previewCanvas.parentElement.innerHTML = "<p style='color: #ff6b6b;'>Vorschau konnte nicht geladen werden.</p>";
                }
            }
        }
    }

    function updateButtons() {
        if (!prevBtn || !nextBtn || !submitBtn) return;
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
        nextBtn.disabled = (currentStep === 1 && !formData.nameValidated);
        nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
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
                 try { errorJson = await response.clone().json(); } catch (e) { /* Ignore */ }

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
             } else if (name.length > 0 && name.length < 3) {
                 minecraftNameFeedback.textContent = 'Name muss mindestens 3 Zeichen lang sein.';
                 minecraftNameFeedback.className = 'input-feedback';
                 formData.nameValidated = false;
                 updateButtons();
                 nameCheckLoader.style.display = 'none';
                 return;
             } else {
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
            clearFeedback();
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
    if (skinUploadInput) {
        skinUploadInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file && file.type === "image/png") {
                formData.skinFile = file;
                if (skinFileNameDisplay) skinFileNameDisplay.textContent = `Skin: ${file.name}`;
                if (currentStep === totalSteps && previewSkinViewer) {
                    const url = URL.createObjectURL(file);
                    previewSkinViewer.loadSkin(url).then(() => URL.revokeObjectURL(url));
                }
            } else {
                formData.skinFile = null;
                if (skinFileNameDisplay) skinFileNameDisplay.textContent = '';
                if(file) alert("Bitte nur PNG-Dateien für Skins auswählen.");
                if (currentStep === totalSteps && previewSkinViewer) {
                    const skinToLoad = formData.fetchedSkinUrl || "/img/skin.png";
                    previewSkinViewer.loadSkin(skinToLoad);
                }
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
                 if (currentStep === totalSteps && previewSkinViewer) {
                    const url = URL.createObjectURL(file);
                     previewSkinViewer.loadCape(url, { backEquipment: 'cape' }).then(() => URL.revokeObjectURL(url));
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
    }

    function validateStep(step) {
        let isValid = true;
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
             } else if (capeNameValue.length > 30) {
                 if (capeNameFeedback) capeNameFeedback.textContent = 'Der Cape-Name darf maximal 30 Zeichen lang sein.';
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
        let skinSource = "/img/skin.png";
        if (formData.fetchedSkinUrl) {
             skinSource = formData.fetchedSkinUrl;
        }
        if (formData.skinFile) {
            skinSource = URL.createObjectURL(formData.skinFile);
            previewSkinViewer.loadSkin(skinSource).then(() => {
                if (skinSource.startsWith('blob:')) { URL.revokeObjectURL(skinSource); }
            }).catch(err => console.error("Error loading manually uploaded skin:", err));
        } else {
             previewSkinViewer.loadSkin(skinSource).catch(err => {
                 console.error("Error loading fetched/default skin:", skinSource, err);
                 if (skinSource !== "/img/skin.png") {
                     previewSkinViewer.loadSkin("/img/skin.png");
                 }
             });
         }
        if (formData.capeFile) {
            const capeUrl = URL.createObjectURL(formData.capeFile);
             previewSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
               .then(() => URL.revokeObjectURL(capeUrl))
               .catch(err => console.error("Error loading cape:", err));
        } else {
            previewSkinViewer.loadCape(null);
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
                    if (!response.ok) { result = { detail: `Serverfehler: ${response.status} ${response.statusText}`}; }
                }
                if (response.ok) {
                     setCookie("capeUploadedToday", "true", 1);
                     if (formContainer) formContainer.style.display = 'none';
                     if (navigationContainer) navigationContainer.style.display = 'none';
                     if (successMessageContainer) successMessageContainer.style.display = 'block';
                     if (stepTitle) stepTitle.textContent = "Fertig!";
                     if (progressBar) progressBar.style.width = '100%';
                     console.log(`Cape '${formData.capeName}' uploaded successfully! ID: ${result.cape_id || 'N/A'}`);
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