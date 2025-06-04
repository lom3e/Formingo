const fs = require('fs');
const path = require('path');

let validApiKeys = {};

// Carica i dati da clients.json all'avvio
try {
  const data = fs.readFileSync(path.join(__dirname, '..', 'clients.json'), 'utf-8');
  validApiKeys = JSON.parse(data);
  console.log(`✅ Caricate ${Object.keys(validApiKeys).length} API key da clients.json`);
} catch (error) {
  console.error('❌ Errore caricamento clients.json:', error);
}

/**
 * Middleware per autenticare la API key passata nell'header 'x-api-key'.
 * Se valida, salva su req.client i dati associati e passa al prossimo middleware.
 * Altrimenti risponde con 401.
 */
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'];  // accetta anche maiuscole

  if (!apiKey) {
    console.warn(`🔒 Accesso negato: API key mancante. IP: ${req.ip}`);
    return res.status(401).json({ success: false, message: "API key mancante." });
  }

  const client = validApiKeys[apiKey];
  if (!client) {
    console.warn(`🔒 Accesso negato: API key non valida "${apiKey}". IP: ${req.ip}`);
    return res.status(401).json({ success: false, message: "API key non valida." });
  }

  req.client = client;

  console.log(`✅ Richiesta autenticata da cliente "${client.clientId || apiKey}". IP: ${req.ip}`);
  next();
}

module.exports = authenticateApiKey;
