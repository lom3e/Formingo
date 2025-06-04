const express = require('express');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');
const authenticateApiKey = require('./middlewares/authenticateApiKey');

app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173' // oppure '*' per qualsiasi origine (meno sicuro)
}));

// Rotta test
app.get('/', (req, res) => {
    res.send('Formingo API is running');
});

app.get('/hello', (req, res) => {
    res.send('Hello, this is Formingo!');
});

// POST /contact
app.post('/contact', authenticateApiKey, async (req, res) => {
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

    // Leggi le credenziali dal client autenticato oppure da .env
    const recaptchaSecret = req.client?.recaptchaSecret || process.env.RECAPTCHA_SECRET;
    const adminEmail = req.client?.email || process.env.ADMIN_EMAIL;  // mittente da JSON
    const gmailUser = req.client?.email || process.env.GMAIL_USER;    // user gmail è email cliente
    const gmailPass = req.client?.gmailPass || process.env.GMAIL_APP_PASS;

    // Verifica reCAPTCHA se non disabilitato
    const isRecaptchaDisabled = process.env.DISABLE_RECAPTCHA === 'true';
    if (!isRecaptchaDisabled) {
        if (!token) {
            return res.status(400).json({ error: 'reCAPTCHA token missing.' });
        }

        try {
            const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${token}`;
            const response = await axios.post(verifyURL);
            const data = response.data;
            if (!data.success) {
                return res.status(403).json({ error: 'Failed reCAPTCHA verification.' });
            } else {
                console.log("✅ Verifica captcha superata.");
            }
        } catch (err) {
            console.error('❌ Errore verifica reCAPTCHA:', err);
            return res.status(500).json({ error: 'Errore interno nel server.' });
        }
    } else {
        console.log('⚠️ Verifica reCAPTCHA disabilitata (modalità sviluppo)');
    }

    // EMAIL: contenuto
    const adminSubject = `Nuovo messaggio da ${name}`;
    const adminText = `Hai ricevuto un nuovo messaggio:\n\nNome: ${name}\nEmail: ${email}\nMessaggio:\n${message}`;
    const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <h2 style="color: #d6336c;">📥 Nuovo messaggio dal form</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
        <p><strong>Messaggio:</strong></p>
        <blockquote style="background: #f8f9fa; padding: 15px; border-left: 5px solid #0d6efd;">
          ${message.replace(/\n/g, '<br>')}
        </blockquote>
        <hr style="margin: 30px 0;">
        <p style="font-size: 14px; color: #6c757d;">Questa è una copia automatica della richiesta ricevuta tramite Formingo.</p>
      </div>
    </div>
  `;

    const userSubject = 'Conferma ricezione messaggio';
    const userText = `Ciao ${name},\n\nGrazie per averci scritto!...`;
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

    try {
        await sendEmail(adminEmail, adminSubject, adminText, false, adminHtml, gmailUser, gmailPass);
        await sendEmail(email, userSubject, userText, true, userHtml, gmailUser, gmailPass);
        res.json({ message: "Form inviato correttamente!" });
        console.log('✅ Email inviate con successo.');
    } catch (err) {
        console.error('❌ Errore invio email:', err);
        res.status(500).json({ error: 'Errore nell\'invio delle email.' });
    }
});


async function sendEmail(to, subject, text, sendBcc = false, html = null, gmailUser, gmailPass) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailPass
        }
    });

    const mailOptions = {
        from: `"Formingo" <${gmailUser}>`,
        to,
        subject,
        text,
        ...(sendBcc && { bcc: gmailUser }),
        ...(html && { html })
    };

    return transporter.sendMail(mailOptions);
}

// Avvio server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
