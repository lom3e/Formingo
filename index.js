const express = require('express');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');
const { Resend } = require('resend');

app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Stampo subito la chiave API per debug (non farlo in produzione!)
console.log("Chiave API Resend:", process.env.RESEND_API_KEY);

// Rotta base per testare se il server è attivo
app.get('/', (req, res) => {
    res.send('Formingo API is running');
});

// Rotta di esempio
app.get('/hello', (req, res) => {
  res.send('Hello, this is Formingo!');
});

// Avvio server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Endpoint POST per ricevere i dati del form di contatto
app.post('/contact', async (req, res) => {
    const { name, email, message, privacyAccepted, token } = req.body;

    // Controllo che i campi obbligatori siano compilati
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Controllo formato email con regex semplice
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Controllo che la privacy sia accettata
    if (privacyAccepted !== true) {
        return res.status(400).json({ error: 'Privacy Policy must be accepted.' });
    }

    // Controllo token CAPTCHA solo se NON è disabilitato
    const isRecaptchaDisabled = process.env.DISABLE_RECAPTCHA === 'true';
    if (!isRecaptchaDisabled) {
        if (!token) {
            return res.status(400).json({ error: 'reCAPTCHA token missing. Invalid verification.' });
        }

        const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;

        try {
            const response = await axios.post(verifyURL);
            const data = response.data;

            if (!data.success) {
                return res.status(403).json({ error: 'Failed reCAPTCHA verification.' });
            }
        } catch (err) {
            console.error('Errore nella verifica reCAPTCHA:', err);
            return res.status(500).json({ error: 'Internal Server Error.' });
        }
    } else {
        console.log('Verifica reCAPTCHA disabilitata (modalità sviluppo)');
    }

    // Se arrivi qui, tutto è ok
    console.log("Dati validi:", req.body);

    // Rispondo subito al client
    res.json({ message: "Form submitted successfully." });

    // Preparo email all'amministratore
    const adminEmail = 'matteolm207@gmail.com';
    const adminSubject = `Nuovo messaggio da ${name}`;
    const adminText = `Hai ricevuto un nuovo messaggio:\nNome: ${name}\nEmail: ${email}\nMessaggio: ${message}`;

    // Preparo email di conferma all'utente
    const userSubject = 'Conferma ricezione messaggio';
    const userText = `Ciao ${name},\n\nGrazie per averci scritto! Abbiamo ricevuto il tuo messaggio.`;

    // Invio email (non blocco la risposta al client se falliscono)
    await sendEmail(adminEmail, adminSubject, adminText);
    await sendEmail(email, userSubject, userText);

});

async function sendEmail(to, subject, text) {
  try {
    const data = await resend.emails.send({
      from: 'matteolm2007@gmail.com', // Assicurati che questa mail sia verificata su Resend
      to,
      subject,
      text,
    });
    console.log('Email inviata:', data);
  } catch (error) {
    console.error('Errore invio email:', error);
  }
}
