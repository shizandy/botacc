// Serveur d'authentification pour les bots Pterodactyl
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Base de données simple pour stocker les autorisations (dans un déploiement réel, utilisez une vraie BD)
let authDB = [];

// Données par défaut - Bot pré-approuvé
const defaultAuthData = [
  {
    "botId": "levantermax",
    "phoneNumber": "50931312968",
    "instanceId": "52599299-7816-4d04-bc5c-e018cc3bb140",
    "deviceInfo": {},
    "status": "approved",
    "createdAt": "2025-05-16T19:22:43.000Z",
    "approvedAt": "2025-05-16T19:22:43.000Z",
    "lastPing": "2025-05-16T19:22:43.000Z",
    "expiresAt": null
  }
];

// Chargement des données depuis le fichier si disponible
try {
  if (fs.existsSync('./authData.json')) {
    const rawData = fs.readFileSync('./authData.json', 'utf8');
    authDB = JSON.parse(rawData);
    console.log('Base de données d\'autorisation chargée');
  } else {
    // Utiliser les données par défaut si le fichier n'existe pas
    authDB = [...defaultAuthData];
    console.log('Utilisation des données d\'autorisation par défaut');
  }
} catch (err) {
  console.error('Erreur lors du chargement de la base de données:', err);
  // Utiliser les données par défaut en cas d'erreur
  authDB = [...defaultAuthData];
  console.log('Utilisation des données d\'autorisation par défaut après erreur');
}

// Middleware pour vérifier la clé API admin
const checkAdminKey = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Non autorisé' });
  }
  
  next();
};

// Route pour valider si un bot est autorisé à s'exécuter
app.post('/api/validate', async (req, res) => {
  const { botId, phoneNumber, instanceId } = req.body;
  
  if (!botId || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID du bot et numéro de téléphone requis' 
    });
  }
  
  // Recherche de l'autorisation
  const auth = authDB.find(a => 
    a.botId === botId && 
    a.phoneNumber === phoneNumber && 
    a.instanceId === instanceId
  );
  
  if (!auth) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bot non autorisé à s\'exécuter'
    });
  }
  
  // Vérification de l'expiration
  if (auth.expiresAt && new Date(auth.expiresAt) < new Date()) {
    return res.status(403).json({ 
      success: false, 
      message: 'Autorisation expirée'
    });
  }
  
  // Mise à jour du dernier ping
  auth.lastPing = new Date().toISOString();
  
  // Sauvegarde de la base de données
  try {
    fs.writeFileSync('./authData.json', JSON.stringify(authDB, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la base de données:', err);
  }
  
  return res.json({ 
    success: true, 
    message: 'Bot autorisé', 
    expiresAt: auth.expiresAt
  });
});

// Route pour enregistrer un nouveau bot (inscription initiale)
app.post('/api/register', async (req, res) => {
  const { botId, phoneNumber, deviceInfo } = req.body;
  
  if (!botId || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID du bot et numéro de téléphone requis' 
    });
  }
  
  // Génération d'un ID d'instance unique
  const instanceId = uuidv4();
  
  // Ajout à la liste en attente d'approbation
  const pendingAuth = {
    botId,
    phoneNumber,
    instanceId,
    deviceInfo: deviceInfo || {},
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastPing: new Date().toISOString()
  };
  
  authDB.push(pendingAuth);
  
  // Sauvegarde de la base de données
  try {
    fs.writeFileSync('./authData.json', JSON.stringify(authDB, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la base de données:', err);
  }
  
  return res.json({ 
    success: true, 
    message: 'Demande d\'autorisation enregistrée. En attente d\'approbation.', 
    instanceId
  });
});

// Route pour approuver une demande d'autorisation (admin seulement)
app.post('/api/authorize', checkAdminKey, async (req, res) => {
  const { instanceId, expiresInDays } = req.body;
  
  if (!instanceId) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID d\'instance requis' 
    });
  }
  
  // Recherche de l'instance en attente
  const authIndex = authDB.findIndex(a => a.instanceId === instanceId);
  
  if (authIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Instance non trouvée' 
    });
  }
  
  // Calcul de la date d'expiration si spécifiée
  let expiresAt = null;
  if (expiresInDays) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expiresInDays));
    expiresAt = expirationDate.toISOString();
  }
  
  // Mise à jour du statut
  authDB[authIndex].status = 'approved';
  authDB[authIndex].approvedAt = new Date().toISOString();
  authDB[authIndex].expiresAt = expiresAt;
  
  // Sauvegarde de la base de données
  try {
    fs.writeFileSync('./authData.json', JSON.stringify(authDB, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la base de données:', err);
  }
  
  return res.json({ 
    success: true, 
    message: 'Autorisation accordée avec succès',
    authorization: authDB[authIndex]
  });
});

// Route pour révoquer une autorisation (admin seulement)
app.post('/api/revoke', checkAdminKey, async (req, res) => {
  const { instanceId } = req.body;
  
  if (!instanceId) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID d\'instance requis' 
    });
  }
  
  // Recherche de l'instance
  const authIndex = authDB.findIndex(a => a.instanceId === instanceId);
  
  if (authIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      message: 'Instance non trouvée' 
    });
  }
  
  // Mise à jour du statut ou suppression
  authDB[authIndex].status = 'revoked';
  authDB[authIndex].revokedAt = new Date().toISOString();
  
  // Sauvegarde de la base de données
  try {
    fs.writeFileSync('./authData.json', JSON.stringify(authDB, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de la base de données:', err);
  }
  
  return res.json({ 
    success: true, 
    message: 'Autorisation révoquée avec succès' 
  });
});

// Route pour lister toutes les instances (admin seulement)
app.get('/api/instances', checkAdminKey, async (req, res) => {
  return res.json({ 
    success: true, 
    instances: authDB 
  });
});

// Route pour vérifier l'état du serveur
app.get('/api/health', (req, res) => {
  return res.json({ 
    success: true, 
    message: 'Serveur d\'authentification en ligne',
    timestamp: new Date().toISOString(),
    instanceCount: authDB.length
  });
});

// Route home
app.get('/', (req, res) => {
  res.send('Serveur d\'authentification Pterodactyl actif');
});

// Port pour les tests locaux (Vercel utilisera sa propre configuration)
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
}

// Exportation pour Vercel
module.exports = app;
