document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const domainInput = document.getElementById('domain-input');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');
    const terminalLogs = document.getElementById('terminal-logs');

    // Result fields
    const resBadge = document.getElementById('validity-badge');
    const resDomain = document.getElementById('res-domain');
    const resDays = document.getElementById('res-days');
    const resIssuer = document.getElementById('res-issuer');
    const resSubject = document.getElementById('res-subject');
    const resFrom = document.getElementById('res-from');
    const resTo = document.getElementById('res-to');
    const resFingerprint = document.getElementById('res-fingerprint');
    const resSerial = document.getElementById('res-serial');

    // Canvas Background
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particles = [];
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = Math.random() > 0.5 ? '#0f0' : '#0ff';
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 100; i++) particles.push(new Particle());

    const animateBg = () => {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
            // Draw connections
            particles.forEach(p2 => {
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.strokeStyle = `rgba(0, 255, 0, ${1 - dist / 100})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });
        requestAnimationFrame(animateBg);
    };
    animateBg();

    // Scanning Logic
    const addLog = (msg) => {
        const p = document.createElement('p');
        p.textContent = `> ${msg}`;
        terminalLogs.appendChild(p);
        terminalLogs.scrollTop = terminalLogs.scrollHeight;
    };

    scanBtn.addEventListener('click', async () => {
        const domain = domainInput.value.trim();
        if (!domain) {
            alert('PLEASE ENTER A DOMAIN');
            return;
        }

        // Reset UI
        resultsSection.classList.add('hidden');
        loader.classList.remove('hidden');
        terminalLogs.innerHTML = '';

        // Emulate steps
        addLog(`Initializing scan for ${domain}...`);
        await new Promise(r => setTimeout(r, 500));
        addLog('Resolving DNS...');
        await new Promise(r => setTimeout(r, 600));
        addLog('Establishing Secure Handshake...');
        await new Promise(r => setTimeout(r, 800));
        addLog('Retrieving Certificate Chain...');

        try {
            const response = await fetch(`/api/scan?domain=${domain}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Scan Failed');
            }

            addLog('Scan Complete. Decrypting Results...');
            await new Promise(r => setTimeout(r, 500));
            loader.classList.add('hidden');
            resultsSection.classList.remove('hidden');

            renderResults(data);

        } catch (err) {
            addLog(`ERROR: ${err.message}`);
            // Keep loader visible with error
        }
    });

    const renderResults = (data) => {
        resDomain.textContent = data.domain;
        resDays.textContent = `${data.daysRemaining} Days`;
        resIssuer.textContent = typeof data.issuer === 'object' ? JSON.stringify(data.issuer).replace(/[{"}]/g, '').replace(/,/g, ', ') : data.issuer.CN || data.issuer;
        // Simplify issuer object to string if complex
        if (typeof data.issuer === 'object') {
            resIssuer.textContent = `CN=${data.issuer.CN}, O=${data.issuer.O}, C=${data.issuer.C}`;
        }
        if (typeof data.subject === 'object') {
            resSubject.textContent = `CN=${data.subject.CN}, O=${data.subject.O}`;
        }

        resFrom.textContent = data.validFrom;
        resTo.textContent = data.validTo;
        resFingerprint.textContent = data.fingerprint;
        resSerial.textContent = data.serialNumber;

        // Badge Logic
        resBadge.className = 'status-badge';
        if (data.valid) {
            resBadge.textContent = 'SECURE';
            resBadge.classList.add('valid');
        } else {
            resBadge.textContent = 'INSECURE';
            resBadge.classList.add('invalid');
        }

        if (data.daysRemaining < 30 && data.daysRemaining > 0) {
            resBadge.textContent = 'EXPIRING SOON';
            resBadge.classList.replace('valid', 'warning');
        }
    };
});
