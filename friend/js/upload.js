document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const progressBar = document.getElementById('progress-bar');
    const statusMessages = document.getElementById('status-messages');
    const tagsInput = document.getElementById('tags');

    let filesToUpload = [];
    let uploadInProgress = false;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        filesToUpload = [...filesToUpload, ...files];
        updateStatus(`Hinzugefügt: ${files.length} Datei(en)`);
        updateUploadButton();
    }

    uploadBtn.addEventListener('click', async () => {
        if (uploadInProgress || filesToUpload.length === 0) return;

        uploadInProgress = true;
        updateUploadButton();
        progressBar.style.width = '0%';

        const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        try {
            for (let i = 0; i < filesToUpload.length; i++) {
                const file = filesToUpload[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('tags', JSON.stringify(tags));

                const response = await fetch('https://api.cookieattack.de/upload', {
                    method: 'POST',
                    body: formData,
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            ((i + progressEvent.loaded / progressEvent.total) / filesToUpload.length) * 100
                        );
                        progressBar.style.width = `${percentCompleted}%`;
                    }
                });

                if (!response.ok) throw new Error('Upload fehlgeschlagen');

                updateStatus(`Erfolgreich hochgeladen: ${file.name}`, 'success');
            }
        } catch (error) {
            console.error('Upload error:', error);
            updateStatus(`Fehler beim Hochladen: ${error.message}`, 'error');
        } finally {
            uploadInProgress = false;
            filesToUpload = [];
            updateUploadButton();
            progressBar.style.width = '0%';
        }
    });

    function updateStatus(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;
        statusMessages.appendChild(messageDiv);
        statusMessages.scrollTop = statusMessages.scrollHeight;
    }

    function updateUploadButton() {
        uploadBtn.disabled = uploadInProgress || filesToUpload.length === 0;
        uploadBtn.textContent = uploadInProgress ? 'Upload läuft...' : 'Hochladen';
    }
});