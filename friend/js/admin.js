document.addEventListener('DOMContentLoaded', () => {
    const mediaList = document.getElementById('media-list');
    const statusMessages = document.getElementById('status-messages');

    async function loadMedia() {
        try {
            const response = await fetch('https://api.cookieattack.de/admin/media');
            const mediaItems = await response.json();
            renderMediaList(mediaItems);
        } catch (error) {
            showStatus('Fehler beim Laden der Medien: ' + error.message, 'error');
        }
    }

    function renderMediaList(mediaItems) {
        mediaList.innerHTML = '';
        mediaItems.forEach(media => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';

            const preview = document.createElement(media.filetype === 'video' ? 'video' : 'img');
            preview.src = `https://api.cookieattack.de/uploads/${media.filename}`;
            preview.className = 'media-preview';
            if (media.filetype === 'video') {
                preview.controls = true;
                preview.muted = true;
            }

            const info = document.createElement('div');
            info.className = 'media-info';
            info.innerHTML = `
                <p>Dateiname: ${media.filename}</p>
                <p>Hochgeladen am: ${new Date(media.upload_date).toLocaleString()}</p>
                <div class="tags">Tags: ${media.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            `;

            const actions = document.createElement('div');
            actions.className = 'media-actions';
            actions.innerHTML = `
                <button class="approve-btn" data-id="${media.id}">Genehmigen</button>
                <button class="reject-btn" data-id="${media.id}">Ablehnen</button>
                <button class="edit-btn" data-id="${media.id}">Tags bearbeiten</button>
            `;

            mediaItem.appendChild(preview);
            mediaItem.appendChild(info);
            mediaItem.appendChild(actions);
            mediaList.appendChild(mediaItem);
        });

        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => handleApproval(btn.dataset.id, true));
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => handleApproval(btn.dataset.id, false));
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
    }

    async function handleApproval(mediaId, approved) {
        try {
            const response = await fetch(`https://api.cookieattack.de/admin/media/${mediaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ approved })
            });

            if (!response.ok) throw new Error('Fehler bei der Anfrage');

            showStatus(`Medien ${approved ? 'genehmigt' : 'abgelehnt'}`, 'success');
            loadMedia();
        } catch (error) {
            showStatus('Fehler: ' + error.message, 'error');
        }
    }

    function showStatus(message, type = 'info') {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        statusMessages.appendChild(statusDiv);
        setTimeout(() => statusDiv.remove(), 5000);
    }

    loadMedia();
});