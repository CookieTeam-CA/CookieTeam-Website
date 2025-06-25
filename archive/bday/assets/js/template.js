document.addEventListener('DOMContentLoaded', () => {
    // Füllt die Seite mit den Daten aus der config.js
    document.title = `Von ${pageConfig.from} für ${pageConfig.recipient}`;
    document.getElementById('page-title').textContent = pageConfig.title;
    document.getElementById('page-from').textContent = `von ${pageConfig.from}`;
    document.getElementById('back-link').href = `../${pageConfig.recipient}.html`;

    const container = document.getElementById('content-blocks');

    pageConfig.contentBlocks.forEach(blockData => {
        const block = document.createElement('div');
        block.className = 'block';
        let contentHTML = '';

        switch (blockData.type) {
            case 'text':
                contentHTML = `<p>${blockData.content}</p>`;
                break;
            case 'image':
                contentHTML = `<img src="${blockData.content}" alt="Geburtstagsbild">`;
                if (blockData.caption) {
                    contentHTML += `<p class="caption">${blockData.caption}</p>`;
                }
                break;
            case 'video':
                contentHTML = `<div class="video-wrapper"><iframe src="${blockData.content}" frameborder="0" allowfullscreen></iframe></div>`;
                break;
            case 'tiktok':
                contentHTML = `<blockquote class="tiktok-embed" cite="${blockData.content}" data-video-id="${blockData.content.split('/').pop()}" style="max-width: 605px;min-width: 325px;" > <section></section> </blockquote> <script async src="https://www.tiktok.com/embed.js"><\/script>`;
                break;
            case 'link':
                contentHTML = `<a href="${blockData.url}" target="_blank" class="link-button">${blockData.text}</a>`;
                break;
        }
        block.innerHTML = contentHTML;
        container.appendChild(block);
    });

    // Start-Animation für die Inhaltsblöcke
    gsap.from(".block", {
        duration: 0.8,
        y: 60,
        opacity: 0,
        stagger: 0.2,
        ease: "power3.out",
        delay: 0.3
    });
});