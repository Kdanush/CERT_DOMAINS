const express = require('express');
const cors = require('cors');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Helper function to format date
const formatDate = (date) => {
    return new Date(date).toLocaleString();
};

// Helper to calculate days remaining
const getDaysRemaining = (valid_to) => {
    const now = new Date();
    const expiry = new Date(valid_to);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

app.get('/api/scan', (req, res) => {
    const domain = req.query.domain;
    if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    const options = {
        host: domain,
        port: 443,
        servername: domain, // SNI support
        rejectUnauthorized: false, // Don't crash on self-signed, we want to inspect it
        requestCert: true,
        agent: false
    };

    try {
        const socket = tls.connect(options, () => {
            const cert = socket.getPeerCertificate(true); // true for full certificate chain details if needed

            if (!cert || Object.keys(cert).length === 0) {
                res.status(500).json({ error: 'Could not retrieve certificate' });
                socket.end();
                return;
            }

            const daysRemaining = getDaysRemaining(cert.valid_to);
            const isValid = socket.authorized || (daysRemaining > 0); // Basic check, unauthorized triggers on self-signed

            const result = {
                domain: domain,
                valid: isValid,
                validFrom: formatDate(cert.valid_from),
                validTo: formatDate(cert.valid_to),
                daysRemaining: daysRemaining,
                issuer: cert.issuer,
                subject: cert.subject,
                fingerprint: cert.fingerprint,
                serialNumber: cert.serialNumber,
                algorithm: cert.pubkeyAlgorithm || 'unknown', // Might vary across node versions
                authorized: socket.authorized,
                authorizationError: socket.authorizationError
            };

            socket.end();
            res.json(result);
        });

        socket.on('error', (err) => {
            res.status(500).json({ error: err.message });
        });

        socket.setTimeout(10000, () => {
            socket.destroy();
            res.status(408).json({ error: 'Connection timed out' });
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
