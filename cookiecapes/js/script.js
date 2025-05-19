let modalSkinViewer = null;
let capeModal, modalCanvas, closeModalButton, modalCapeName, modalCapeId, modalSkinToggle, modalPanoramaSelect, modalOverlay;
const defaultSkinPath = "/img/skin.png";
const defaultIndexGalleryBackgroundColor = 0x1a1a1a;
const defaultModalCanvasBackgroundColor = 0x1a1a1a;
const defaultModalViewerBackgroundColor = 0x2e2e2e;


function getCorrectCapeImageUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
        return null;
    }
    try {
        let correctedUrl = originalUrl;        if (correctedUrl && correctedUrl.startsWith('http://')) {
             const urlObj = new URL(correctedUrl);
             if (urlObj.protocol === 'http:' && urlObj.hostname === 'api.cookieattack.de' && urlObj.port === '8000') {
                 urlObj.protocol = 'https:';
                 urlObj.port = '8989';
                 correctedUrl = urlObj.toString();
             }
        }
        return correctedUrl;
    } catch (e) {
        console.error("Error constructing/correcting cape image URL from:", originalUrl, e);
        return null;
    }
}

function initializeGeneralScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (!animatedElements.length) return;

    const observerOptions = {
        root: null, 
        rootMargin: '0px',
        threshold: 0.1 
    };

    const animationObserver = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observerInstance.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        animationObserver.observe(el);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeGeneralScrollAnimations();

    window.addEventListener("scroll", () => {
        const header = document.querySelector("header");
        if (header) {
            header.classList.toggle("floating", window.scrollY > 50);
        }
    });

    if (document.querySelector('.improved-hero')) { 
        typeHeroTitle();
        if (document.getElementById('capeContainer')) {
           fetchRandomCapes();
        }
    }
    
    const capeUploadForm = document.getElementById('capeUploadForm');
    const capeUploadSection = document.getElementById('capeUpload');

    if (capeUploadForm && capeUploadSection) {
        const formContainer = document.getElementById('multiStepForm');
        const navigationContainer = document.getElementById('stepNavigation');
        const successMessageContainer = document.getElementById('successMessage');
        const limitMessageContainer = document.getElementById('limitMessage');
        const wizardContainer = document.querySelector('.step-wizard-container');
        const steps = formContainer.querySelectorAll('.form-step');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        const progressBar = document.getElementById('progressBar');
        const stepTitle = document.getElementById('stepTitle');
        const editBtn = document.getElementById('editBtn');
        const minecraftNameInput = document.getElementById('minecraftName');
        const rulesAgreeCheckbox = document.getElementById('rulesAgreeCheckbox');
        const capeNameInput = document.getElementById('capeName');
        const capeUploadInput = document.getElementById('capeUploadInput');
        const capeFileNameDisplay = document.getElementById('capeFileName');
        const previewMinecraftName = document.getElementById('previewMinecraftName');
        const previewCapeName = document.getElementById('previewCapeName');
        const minecraftNameFeedback = document.getElementById('minecraftNameFeedback');
        const rulesAgreeFeedback = document.getElementById('rulesAgreeFeedback');
        const capeNameFeedback = document.getElementById('capeNameFeedback');
        const capeFileFeedback = document.getElementById('capeFileFeedback');
        const nameCheckLoader = document.getElementById('nameCheckLoader');
        const previewCanvas = document.getElementById("skin_preview_canvas");
        let previewSkinViewer = null;

        let currentStep = 1;
        const totalSteps = 5;
        const formData = {
            minecraftName: '', capeName: '', capeFile: null,
            fetchedSkinUrl: null, nameValidated: false, rulesAgreed: false
        };

        const uploadCookie = getCookie("capeUploadedToday");
        if (uploadCookie) {
            if (capeUploadForm) capeUploadForm.style.display = 'none';
            if (limitMessageContainer) limitMessageContainer.style.display = 'block';
            if (wizardContainer) wizardContainer.style.minHeight = '200px';
            if (navigationContainer) navigationContainer.style.display = 'none';
            if (stepTitle) stepTitle.textContent = "Limit erreicht";
            if (progressBar) progressBar.style.width = '100%';
            console.log("Daily upload limit reached.");
            return; 
        } else {
           if (limitMessageContainer) limitMessageContainer.style.display = 'none';
           updateButtons(); 
        }
        
        initializePreviewViewer();


        function initializePreviewViewer() {
            if (!previewSkinViewer && previewCanvas) {
                 try {
                    previewSkinViewer = new skinview3d.SkinViewer({
                        canvas: previewCanvas, width: previewCanvas.width, height: previewCanvas.height,
                        skin: defaultSkinPath, background: null
                    });
    
                    previewCanvas.style.backgroundColor = 'var(--text-color-alpha-05)';
                    previewSkinViewer.fov = 60; previewSkinViewer.zoom = 0.85; previewSkinViewer.globalLight.intensity = 3;
                    previewSkinViewer.cameraLight.intensity = 3; previewSkinViewer.autoRotate = true; previewSkinViewer.autoRotateSpeed = 0.5;
                    previewSkinViewer.animation = new skinview3d.WalkingAnimation(); previewSkinViewer.animation.speed = 0.4;
                } catch (e) {
                    console.error("Failed to init preview SkinViewer:", e);
                    if (previewCanvas.parentElement) previewCanvas.parentElement.innerHTML = `<p style='color: var(--error-color);'>Vorschaufehler.</p>`;
                    previewSkinViewer = null;
                }
            }
        }
    
        function updateButtons() {
            if (!prevBtn || !nextBtn || !submitBtn || !rulesAgreeCheckbox) return;
            prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
            nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
            submitBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    
            let nextDisabled = false;
            if (currentStep === 1 && !formData.nameValidated) nextDisabled = true;
            else if (currentStep === 2 && !rulesAgreeCheckbox.checked) nextDisabled = true;
    
            nextBtn.disabled = nextDisabled;
    
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
             const titles = ["Schritt 1: Dein Minecraft-Name", "Schritt 2: Regeln zustimmen", "Schritt 3: Name des Capes", "Schritt 4: Cape Hochladen", "Schritt 5: Vorschau & Bestätigung"];
             const titleText = titles[currentStep - 1] || `Schritt ${currentStep}`;
             stepTitle.style.opacity = 0;
             setTimeout(() => { stepTitle.textContent = titleText; stepTitle.style.opacity = 1; }, 300);
        }
    
        function showStep(stepNumber) {
            if (stepNumber < 1 || stepNumber > totalSteps) return;
            const currentActive = formContainer.querySelector('.form-step.active');
            if (currentActive) {
                currentActive.classList.add('exiting');
                setTimeout(() => { currentActive.classList.remove('active', 'exiting'); }, 500);
            }
            setTimeout(() => {
                const nextStepEl = document.getElementById(`step-${stepNumber}`);
                if (nextStepEl) {
                    nextStepEl.classList.add('active');
                    currentStep = stepNumber;
                    updateButtons();
                    if (currentStep === totalSteps) {
                        initializePreviewViewer();
                        updatePreview();
                    }
                }
            }, currentActive ? 50 : 0);
        }
    
        async function checkMinecraftName(name) {
            formData.nameValidated = false; formData.fetchedSkinUrl = null; updateButtons();
            if (!name || !/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
                 if(name) minecraftNameFeedback.textContent = 'Ungültiges Format (3-16 Zeichen, A-Z, a-z, 0-9, _).';
                 else minecraftNameFeedback.textContent = '';
                 minecraftNameFeedback.className = 'input-feedback';
                 if (nameCheckLoader) nameCheckLoader.style.display = 'none'; return;
            }
            minecraftNameFeedback.textContent = 'Überprüfe Namen...'; minecraftNameFeedback.className = 'input-feedback checking';
            if (nameCheckLoader) nameCheckLoader.style.display = 'block';
            const apiUrl = `https://starlightskins.lunareclipse.studio/render/skin/${name}/default`;
            try {
                const response = await fetch(apiUrl);
                if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                    minecraftNameFeedback.textContent = 'Minecraft-Name gültig!'; minecraftNameFeedback.className = 'input-feedback success';
                    formData.minecraftName = name; formData.fetchedSkinUrl = apiUrl; formData.nameValidated = true;
                } else {
                     let errorJson = null; try { errorJson = await response.clone().json(); } catch (e) {}
                     if (errorJson?.error === "Unknown player username/uuid.") minecraftNameFeedback.textContent = 'Minecraft-Name nicht gefunden.';
                     else minecraftNameFeedback.textContent = 'Fehler bei der Namensüberprüfung.';
                     minecraftNameFeedback.className = 'input-feedback'; formData.fetchedSkinUrl = null; formData.minecraftName = name;
                }
            } catch (error) {
                console.error("Name Check Network error:", error); minecraftNameFeedback.textContent = 'Fehler bei der Namensüberprüfung (Netzwerk).';
                minecraftNameFeedback.className = 'input-feedback'; formData.fetchedSkinUrl = null; formData.minecraftName = name;
            } finally { if (nameCheckLoader) nameCheckLoader.style.display = 'none'; updateButtons(); }
        }
        const debouncedCheckMinecraftName = debounce(checkMinecraftName, 500);
    
        function validateStep(step) {
            let isValid = true;
    
            if (step === 1 && minecraftNameFeedback) minecraftNameFeedback.textContent = '';
            if (step === 2 && rulesAgreeFeedback) rulesAgreeFeedback.textContent = '';
            if (step === 3 && capeNameFeedback) capeNameFeedback.textContent = '';
            if (step === 4 && capeFileFeedback) capeFileFeedback.textContent = '';
    
            if (step === 1) {
                 const name = minecraftNameInput?.value.trim() ?? ''; isValid = false;
                 if (!name) {minecraftNameFeedback.textContent = 'Bitte gib deinen Minecraft-Namen ein.';}
                 else if (!/^[a-zA-Z0-9_]{3,16}$/.test(name)) {minecraftNameFeedback.textContent = 'Ungültiges Format (3-16 Zeichen, A-Z, a-z, 0-9, _).';}
                 else if (!formData.nameValidated) {minecraftNameFeedback.textContent = minecraftNameFeedback.textContent.includes('gefunden') ? 'Minecraft-Name nicht gefunden.' : 'Name konnte nicht validiert werden.';}
                 else {isValid = true;}
            } else if (step === 2) {
                 isValid = false;
                 if (!rulesAgreeCheckbox?.checked) {rulesAgreeFeedback.textContent = 'Du musst den Regeln zustimmen, um fortzufahren.';}
                 else { formData.rulesAgreed = true; isValid = true; }
            } else if (step === 3) {
                 isValid = false; const capeNameValue = capeNameInput?.value.trim() ?? '';
                 if (!capeNameValue) {capeNameFeedback.textContent = 'Bitte gib einen Namen für das Cape ein.';}
                 else if (capeNameValue.length > 20) {capeNameFeedback.textContent = 'Der Cape-Name darf maximal 20 Zeichen lang sein.';}
                 else { formData.capeName = capeNameValue; isValid = true; }
            } else if (step === 4) {
                isValid = false;
                if (!formData.capeFile) {capeFileFeedback.textContent = 'Bitte wähle eine Cape-Datei (PNG) aus.';}
                else {isValid = true;}
            } else if (step === 5) {isValid = true;}
            return isValid;
        }
    
        function clearFeedback() {
            if (minecraftNameFeedback && !minecraftNameFeedback.textContent.includes('gültig') && !minecraftNameFeedback.textContent.includes('Überprüfe')) {
                 minecraftNameFeedback.textContent = '';
            }
            if (rulesAgreeFeedback) rulesAgreeFeedback.textContent = '';
            if (capeNameFeedback) capeNameFeedback.textContent = '';
            if (capeFileFeedback) capeFileFeedback.textContent = '';
            if (nameCheckLoader) nameCheckLoader.style.display = 'none';
        }
    
        function updatePreview() {
             if (!previewSkinViewer || !previewMinecraftName || !previewCapeName) return;
            previewMinecraftName.textContent = formData.minecraftName || 'Nicht angegeben';
            previewCapeName.textContent = formData.capeName || 'Nicht angegeben';
            let skinSource = formData.fetchedSkinUrl || defaultSkinPath;
            previewSkinViewer.loadSkin(skinSource).catch(err => {
                 console.error("Preview skin load error:", skinSource, err);
                 if (skinSource !== defaultSkinPath) previewSkinViewer.loadSkin(defaultSkinPath);
             });
            if (formData.capeFile) {
                const capeUrl = URL.createObjectURL(formData.capeFile);
                 previewSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
                   .then(() => URL.revokeObjectURL(capeUrl))
                   .catch(err => { console.error("Preview cape load error:", err); URL.revokeObjectURL(capeUrl); });
            } else { previewSkinViewer.loadCape(null); }
        }
    
        if (minecraftNameInput) {
            minecraftNameInput.addEventListener('input', () => {
                 const name = minecraftNameInput.value.trim(); formData.nameValidated = false; updateButtons();
                 if ((name && !/^[a-zA-Z0-9_]{1,16}$/.test(name)) || (name.length > 0 && name.length < 3)) {
                     minecraftNameFeedback.textContent = name.length < 3 ? 'Mind. 3 Zeichen.' : 'Ungültige Zeichen.';
                     minecraftNameFeedback.className = 'input-feedback'; if (nameCheckLoader) nameCheckLoader.style.display = 'none'; return;
                 } else if (minecraftNameFeedback.textContent.includes('Zeichen') || minecraftNameFeedback.textContent.includes('Mind.')) {
                     minecraftNameFeedback.textContent = '';
                 }
                 if (name.length >= 3) debouncedCheckMinecraftName(name);
                 else { minecraftNameFeedback.className = 'input-feedback'; if (nameCheckLoader) nameCheckLoader.style.display = 'none'; }
            });
        }
    
         if (rulesAgreeCheckbox) {
             rulesAgreeCheckbox.addEventListener('change', () => {
                formData.rulesAgreed = rulesAgreeCheckbox.checked;
                if (rulesAgreeCheckbox.checked && rulesAgreeFeedback) rulesAgreeFeedback.textContent = '';
                updateButtons();
             });
         }
    
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
    
                if (currentStep === 1 && minecraftNameFeedback) minecraftNameFeedback.textContent = '';
                if (currentStep === 2 && rulesAgreeFeedback) rulesAgreeFeedback.textContent = '';
                if (currentStep === 3 && capeNameFeedback) capeNameFeedback.textContent = '';
                if (currentStep === 4 && capeFileFeedback) capeFileFeedback.textContent = '';
    
                if (validateStep(currentStep)) showStep(currentStep + 1);
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                clearFeedback();
                if (currentStep > 1) showStep(currentStep - 1);
            });
        }
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                clearFeedback();
                showStep(1);
            });
        }
    
        if (capeUploadInput) {
             capeUploadInput.addEventListener("change", function(event) {
                const file = event.target.files[0];
                if (file && file.type === "image/png") {
                    formData.capeFile = file; 
                    if (capeFileNameDisplay) capeFileNameDisplay.textContent = `Cape: ${file.name}`; 
                    if (capeFileFeedback) capeFileFeedback.textContent = '';
                    if (currentStep === totalSteps) updatePreview();
                } else {
                    formData.capeFile = null; 
                    if (capeFileNameDisplay) capeFileNameDisplay.textContent = '';
                    if (file && capeFileFeedback) capeFileFeedback.textContent = "Ungültiger Dateityp (nur PNG).";
                    else if (capeFileFeedback) capeFileFeedback.textContent = '';
                    if (currentStep === totalSteps && previewSkinViewer) previewSkinViewer.loadCape(null);
                }
            });
    
            const fileLabel = document.querySelector('label[for="capeUploadInput"]');
            if (fileLabel) fileLabel.addEventListener('click', (e) => { 
                e.preventDefault();
                capeUploadInput.click(); 
            });
        }
    
        if (capeUploadForm) {
             capeUploadForm.addEventListener('submit', async (event) => {
                 event.preventDefault();
                 clearFeedback();
                 let allValid = true;
                 for (let i = 1; i < totalSteps; i++) {
                     if (!validateStep(i)) {
                         allValid = false; showStep(i); alert("Bitte fülle alle vorherigen Schritte korrekt aus."); break;
                     }
                 }
                 if (!allValid || currentStep !== totalSteps) return;
    
                submitBtn.disabled = true; submitBtn.textContent = 'Lade hoch...';
    
                const apiFormData = new FormData();
                apiFormData.append('minecraft_name', formData.minecraftName);
                apiFormData.append('cape_name', formData.capeName);
                if (!formData.capeFile) {
                     alert("Fehler: Cape-Datei fehlt."); submitBtn.disabled = false; submitBtn.textContent = 'Cape Hochladen'; return;
                }
                apiFormData.append('cape', formData.capeFile, formData.capeFile.name);
    
                const workerUrl = 'https://cloudcookieapi.leonmt12345.workers.dev/web_add_cape';
    
                try {
                     const response = await fetch(workerUrl, { method: 'POST', body: apiFormData });
                     let result = {};
                     try { result = await response.json(); } catch (e) { if (!response.ok) result = { detail: `Serverfehler: ${response.status}`}; }
    
                    if (response.ok) {
                         setCookie("capeUploadedToday", "true", 1);
                         if (formContainer) formContainer.style.display = 'none'; 
                         if (navigationContainer) navigationContainer.style.display = 'none';
                         if (successMessageContainer) {
                            successMessageContainer.innerHTML = `<h2>Cape erfolgreich hochgeladen!</h2><p>Das Cape ist nun für jeden verfügbar.</p>`;
                            successMessageContainer.style.display = 'block';
                         }
                         if (stepTitle) stepTitle.textContent = "Fertig!";
                         if (progressBar) progressBar.style.width = '100%';
                         fetchRandomCapes();
                    } else {
                         const errorDetail = result.detail || `Fehler ${response.status}`;
                         if (response.status === 469) alert(`Upload abgelehnt: Das Bild verstößt gegen die Inhaltsrichtlinien.`);
                         else alert(`Fehler beim Hochladen: ${errorDetail}`);
                         submitBtn.disabled = false; submitBtn.textContent = 'Cape Hochladen';
                    }
                } catch (error) {
                    console.error("Upload Network Error:", error); alert(`Netzwerkfehler: ${error.message}`);
                    submitBtn.disabled = false; submitBtn.textContent = 'Cape Hochladen';
                }
            });
        }

    } else {
        console.log("Cape upload form/section not found, skipping form initialization.");
    }


    capeModal = document.getElementById('capeModal');
    if (capeModal) {
        modalCanvas = document.getElementById('modalCanvas');
        closeModalButton = document.getElementById('closeModalButton');
        modalCapeName = document.getElementById('modalCapeName');
        modalCapeId = document.getElementById('modalCapeId');
        modalSkinToggle = document.getElementById('modalSkinToggle');
        modalPanoramaSelect = document.getElementById('modalPanoramaSelect');
        modalOverlay = capeModal.querySelector('.modal-overlay');

        if (closeModalButton) closeModalButton.addEventListener('click', closeCapeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', closeCapeModal);
        
        if (modalSkinToggle) {
            modalSkinToggle.addEventListener('change', () => {
                if (!modalSkinViewer) return;
                let skinToLoad = null;
                if (modalSkinToggle.checked) {
                    const uploaderNameEl = document.getElementById('modalUploaderName');
                    const uploaderName = uploaderNameEl ? uploaderNameEl.textContent : "N/A";
                    skinToLoad = (uploaderName && uploaderName !== "N/A" && uploaderName !== "Unbekannt") 
                        ? `https://starlightskins.lunareclipse.studio/render/skin/${uploaderName.split(' ')[0]}/default` 
                        : defaultSkinPath;
                }
                modalSkinViewer.loadSkin(skinToLoad)
                               .catch(err => {
                                   console.error("Modal: Skin toggle error:", err);
                                   if (skinToLoad !== defaultSkinPath && skinToLoad !== null) modalSkinViewer.loadSkin(defaultSkinPath);
                               });
            });
        }
        if (modalPanoramaSelect) {
            modalPanoramaSelect.addEventListener('change', () => {
                if (!modalSkinViewer) return;
                const selection = modalPanoramaSelect.value;
                const panoramaPath = selection === 'panorama1' ? '/img/panorama1.png' : null;
    
                if (panoramaPath) {
                    modalSkinViewer.loadPanorama(panoramaPath)
                        .then(() => {
                            console.log("Modal: Loaded panorama", panoramaPath);
                            modalSkinViewer.background = null;
                        })
                        .catch(err => {
                            console.error("Modal: Panorama load error:", err); alert("Panorama konnte nicht geladen werden.");
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
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && capeModal && !capeModal.classList.contains('hidden')) {
                closeCapeModal();
            }
        });
        initializeModalViewer(); 
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

function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}


async function fetchRandomCapes() {
    const container = document.getElementById("capeContainer");
    if (!container) {
        console.error("Cape container element 'capeContainer' not found!");
        return;
    }
    container.innerHTML = `<p style="color:var(--text-color-dim); text-align: center; width: 100%;">Lade zufällige Capes...</p>`;

    try {
        const response = await fetch("https://api.cookieattack.de:8989/list_capes");
        if (!response.ok) throw new Error(`API Error ${response.status}`);

        const result = await response.json();
        const capes = result.capes || [];
        const validCapes = capes.filter(cape => cape.cape_image_url && cape.minecraft_name);

        if (validCapes.length === 0) {
             container.innerHTML = `<p style="color: var(--text-color-dim); text-align: center; width: 100%;">Keine Capes zum Anzeigen gefunden.</p>`;
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
            previewDiv.dataset.capeId = cape.cape_id;
            previewDiv.dataset.capeUrl = correctedImageUrl;
            previewDiv.dataset.capeName = capeNameText;

            if (!correctedImageUrl) {
                previewDiv.innerHTML += `<p style="font-size: 0.8em; color: var(--error-color);">Bild ungültig</p>`;
                return;
            }

            try {
                const viewer = new skinview3d.SkinViewer({
                    canvas: canvas, width: canvas.width, height: canvas.height,
                    skin: defaultSkinPath, background: defaultIndexGalleryBackgroundColor
                });
                viewer.loadCape(correctedImageUrl, { backEquipment: 'cape' })
                      .catch(err => console.error(`Failed to load cape ${correctedImageUrl}:`, err));
                viewer.fov = 70; viewer.zoom = 0.9; viewer.globalLight.intensity = 3;
                viewer.cameraLight.intensity = 3; viewer.autoRotate = true; viewer.autoRotateSpeed = 0.8;

                 previewDiv.addEventListener('click', () => {

                    if (previewDiv.dataset.capeUrl && previewDiv.dataset.capeId !== undefined) {

                        openCapeModal(previewDiv.dataset.capeId, previewDiv.dataset.capeUrl, previewDiv.dataset.capeName, cape.minecraft_name);
                    } else {
                        console.error("Missing data for modal", previewDiv.dataset);
                        alert("Fehler: Details für dieses Cape konnten nicht geladen werden.");
                    }
                 });
            } catch (viewerError) {
                 console.error("Error initializing random gallery SkinViewer:", viewerError);
                 previewDiv.innerHTML = `<p>${capeNameText}</p><p style="font-size: 0.8em; color: var(--error-color);">Vorschaufehler</p>`;
            }
        });

    } catch (err) {
        console.error("Error fetching or displaying random capes:", err);
        if(container) container.innerHTML = `<p style="color: var(--error-color); text-align: center; width: 100%;">Fehler: ${err.message}</p>`;
    }
}

function initializeModalViewer() {
    if (!modalSkinViewer && modalCanvas) {
        try {
            modalSkinViewer = new skinview3d.SkinViewer({
                canvas: modalCanvas, width: modalCanvas.width, height: modalCanvas.height,
                skin: defaultSkinPath, background: defaultModalViewerBackgroundColor
            });
            modalSkinViewer.fov = 65; modalSkinViewer.zoom = 0.8; modalSkinViewer.globalLight.intensity = 2.5;
            modalSkinViewer.cameraLight.intensity = 1.0; modalSkinViewer.autoRotate = false; modalSkinViewer.autoRotateSpeed = 0;
            modalSkinViewer.animation = new skinview3d.WalkingAnimation();
            modalSkinViewer.animation.speed = 0.8;
            modalSkinViewer.animation.paused = true;
            console.log("Modal SkinViewer initialized.");
        } catch (e) {
            console.error("Failed to initialize modal SkinViewer:", e);
            if (modalCanvas.parentElement) modalCanvas.parentElement.innerHTML = `<p style='color: var(--error-color);'>3D-Vorschau konnte nicht geladen werden.</p>`;
            modalSkinViewer = null;
        }
    }
}

function openCapeModal(capeId, capeUrl, capeName, uploaderName = "N/A") {
    if (!capeModal) {
        console.error("Modal elements not ready.");
        return;
    }
    initializeModalViewer();
    if (!modalSkinViewer) {
        alert("Fehler: 3D-Vorschau konnte nicht initialisiert werden.");
        return;
    }

    modalCapeName.textContent = capeName || "Unbenanntes Cape";
    modalCapeId.textContent = capeId !== undefined ? capeId : "N/A";
    
    const modalUploaderNameEl = document.getElementById('modalUploaderName');
    if (modalUploaderNameEl) modalUploaderNameEl.textContent = uploaderName;

    const modalViewDetailsButton = document.getElementById('modalViewDetailsButton');
    if (modalViewDetailsButton) {
        if (capeId !== undefined && capeId !== null) {
            modalViewDetailsButton.href = `cape-detail.html?id=${capeId}`;
            modalViewDetailsButton.style.display = 'inline-block'; // Make sure it's visible
        } else {
            modalViewDetailsButton.href = '#'; // Fallback href
            modalViewDetailsButton.style.display = 'none'; // Hide if no valid Cape ID
        }
    }

    if(modalSkinToggle) modalSkinToggle.checked = true;
    if(modalPanoramaSelect) modalPanoramaSelect.value = 'none';

    let skinToLoad = defaultSkinPath;
    if (uploaderName && uploaderName !== "N/A") {
        skinToLoad = `https://starlightskins.lunareclipse.studio/render/skin/${uploaderName}/default`;
    }

    modalSkinViewer.loadSkin(skinToLoad)
        .catch(err => {
            console.error(`Modal: Failed to load skin for ${uploaderName}:`, err);
            modalSkinViewer.loadSkin(defaultSkinPath);
        });

    modalSkinViewer.loadCape(capeUrl, { backEquipment: 'cape' })
        .then(() => console.log(`Modal: Loaded cape ${capeId}`))
        .catch(err => { console.error(`Modal: Failed cape ${capeUrl}:`, err); modalCapeName.textContent += " (Ladefehler)"; });
    

    modalCanvas.style.backgroundColor = 'var(--card-bg-darker)';
    modalSkinViewer.loadPanorama(null);
    modalSkinViewer.background = null;

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


function typeHeroTitle() {
    const heroTitle = document.querySelector('.improved-hero h1');
    if (!heroTitle) return;
    const originalText = heroTitle.textContent.trim(); 
    heroTitle.textContent = '';
    heroTitle.classList.add('typing'); 
    let i = 0;

    function typeChar() {
        if (i < originalText.length) {
            heroTitle.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeChar, 80); 
        } else {
            heroTitle.classList.remove('typing'); 
            animateHeroFeatures(); 
        }
    }
    if (document.querySelector('.improved-hero')) { 
        setTimeout(typeChar, 300);
    }
}

function animateHeroFeatures() {
    const features = document.querySelectorAll('.hero-features .feature-item');
    if (!features.length) return;

    features.forEach((feature, index) => {
        setTimeout(() => {
            feature.classList.add('visible');
        }, index * 150); 
    });
}