const express = require('express');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');
const nodemailer = require('nodemailer');

app.use(express.json());

// Rotta test
app.get('/', (req, res) => {
    res.send('Formingo API is running');
});

app.get('/hello', (req, res) => {
    res.send('Hello, this is Formingo!');
});

// Avvio server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// POST /contact
app.post('/contact', async (req, res) => {
    const { name, email, message, privacyAccepted, token } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (privacyAccepted !== true) {
        return res.status(400).json({ error: 'Privacy Policy must be accepted.' });
    }

    const isRecaptchaDisabled = process.env.DISABLE_RECAPTCHA === 'true';
    if (!isRecaptchaDisabled) {
        if (!token) {
            return res.status(400).json({ error: 'reCAPTCHA token missing.' });
        }

        const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;

        try {
            const response = await axios.post(verifyURL);
            const data = response.data;
            if (!data.success) {
                return res.status(403).json({ error: 'Failed reCAPTCHA verification.' });
            }
        } catch (err) {
            console.error('Errore verifica reCAPTCHA:', err);
            return res.status(500).json({ error: 'Errore interno nel server.' });
        }
    } else {
        console.log('Verifica reCAPTCHA disabilitata (modalità sviluppo)');
    }

    console.log("Dati validi:", req.body);
    res.json({ message: "Form inviato correttamente!" });

    // Email all'admin
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSubject = `Nuovo messaggio da ${name}`;
    const adminText = `Hai ricevuto un nuovo messaggio:\n\nNome: ${name}\nEmail: ${email}\nMessaggio:\n${message}`;

    // Email conferma utente
    const userSubject = 'Conferma ricezione messaggio';
    const userText = `Ciao ${name},\n\nGrazie per averci scritto! Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto.\n\n— Il team di Formingo`;
    const userHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
            <h2 style="color: #2c3e50;">Ciao ${name},</h2>
            <p>Grazie per averci contattato tramite il form di <strong>Formingo</strong>!</p>
            <p>Abbiamo ricevuto il tuo messaggio:</p>
            <blockquote style="background: #f1f1f1; padding: 15px; border-left: 5px solid #007bff;">
                ${message.replace(/\n/g, '<br>')}
            </blockquote>
            <p>Ti risponderemo il prima possibile. Se hai bisogno urgente, puoi riscriverci a <a href="mailto:info.formingo@gmail.com">info.formingo@gmail.com</a>.</p>
            <hr style="margin: 30px 0;">
            <p style="font-size: 14px; color: #6c757d;">© 2025 Formingo • Questo è un messaggio automatico, non rispondere a questa email.</p>
            </div>
        </div>
        `;
    // Email all’amministratore
    sendEmail(adminEmail, adminSubject, adminText);

    // Email all’utente, con copia nascosta a te
    sendEmail(email, userSubject, userText, true, userHtml);


});

async function sendEmail(to, subject, text, sendBcc = false, html = null) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,       // es: matteolm2007@gmail.com
            pass: process.env.GMAIL_APP_PASS    // App password generata da Gmail
        }
    });

    const mailOptions = {
        from: `"Formingo" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        text,
        ...(sendBcc && { bcc: process.env.GMAIL_USER }), // BCC se richiesto
        ...(html && { html }) // HTML se fornito
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email inviata a:', to);
        if (sendBcc) {
            console.log('📩 Copia nascosta inviata a:', process.env.GMAIL_USER);
        }
    } catch (error) {
        console.error('❌ Errore invio email:', error);
    }
}
