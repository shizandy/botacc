// Serveur d'authentification pour les bots Pterodactyl
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:YbtEJgyPWxZPGFqfKjHhvHjZLBBbIQnl@shortline.proxy.rlwy.net:56805';
const DB_NAME = 'bot_auth';
const COLLECTION_NAME = 'auth_instances';

let dbClient = null;
let authCollection = null;

// Fonction pour se connecter à MongoDB
async function connectToMongoDB() {
  if (dbClient && dbClient.isConnected()) {
    return;
  }

  try {
    dbClient = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await dbClient.connect();
    console.log('Connecté à MongoDB Atlas');
    
    const db = dbClient.db(DB_NAME);
    authCollection = db.collection(COLLECTION_NAME);
    
    // Créer un index pour les recherches efficaces
    await authCollection.createIndex({ botId: 1, phoneNumber: 1, instanceId: 1 }, { unique: true });
    
    // Vérification du nombre d'instances
    const count = await authCollection.countDocuments();
    console.log(`${count} instances trouvées dans la base de données`);
    
    // Si aucune instance, initialiser avec les données par défaut
    if (count === 0) {
      const defaultAuthData = [
        {
          "botId": "levantermax",
          "phoneNumber": "50931312968",
          "instanceId": "pre-approved-instance-12345",
          "deviceInfo": {},
          "status": "approved",
          "createdAt": "2025-05-16T19:43:23.000Z",
          "approvedAt": "2025-05-16T19:43:23.000Z",
          "lastPing": "2025-05-16T19:43:23.000Z",
          "expiresAt": null
        }
      ];
      
      await authCollection.insertMany(defaultAuthData);
      console.log('Données par défaut insérées dans MongoDB');
    }
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    throw error;
  }
}

// Middleware pour vérifier la clé API admin
const checkAdminKey = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Non autorisé' });
  }
  
  next();
};

// Middleware pour s'assurer que la connexion MongoDB est établie
const ensureDbConnected = async (req, res, next) => {
  try {
    await connectToMongoDB();
    next();
  } catch (error) {
    console.error('Erreur de connexion à la base de données:', error);
    res.status(500).json({ success: false, message: 'Erreur de connexion à la base de données' });
  }
};

// Appliquer le middleware de connexion à MongoDB à toutes les routes
app.use(ensureDbConnected);

// Route pour valider si un bot est autorisé à s'exécuter
app.post('/api/validate', async (req, res) => {
  const { botId, phoneNumber, instanceId } = req.body;
  
  if (!botId || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID du bot et numéro de téléphone requis' 
    });
  }
  
  try {
    // Recherche de l'autorisation
    const auth = await authCollection.findOne({
      botId: botId,
      phoneNumber: phoneNumber,
      instanceId: instanceId
    });
    
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
    await authCollection.updateOne(
      { instanceId: instanceId },
      { $set: { lastPing: new Date().toISOString() } }
    );
    
    return res.json({ 
      success: true, 
      message: 'Bot autorisé', 
      expiresAt: auth.expiresAt
    });
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
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
  
  try {
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
    
    await authCollection.insertOne(pendingAuth);
    
    return res.json({ 
      success: true, 
      message: 'Demande d\'autorisation enregistrée. En attente d\'approbation.', 
      instanceId
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
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
  
  try {
    // Recherche de l'instance en attente
    const auth = await authCollection.findOne({ instanceId: instanceId });
    
    if (!auth) {
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
    await authCollection.updateOne(
      { instanceId: instanceId },
      { 
        $set: {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          expiresAt: expiresAt
        }
      }
    );
    
    const updatedAuth = await authCollection.findOne({ instanceId: instanceId });
    
    return res.json({ 
      success: true, 
      message: 'Autorisation accordée avec succès',
      authorization: updatedAuth
    });
  } catch (error) {
    console.error('Erreur lors de l\'autorisation:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
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
  
  try {
    // Recherche de l'instance
    const auth = await authCollection.findOne({ instanceId: instanceId });
    
    if (!auth) {
      return res.status(404).json({ 
        success: false, 
        message: 'Instance non trouvée' 
      });
    }
    
    // Mise à jour du statut
    await authCollection.updateOne(
      { instanceId: instanceId },
      { 
        $set: {
          status: 'revoked',
          revokedAt: new Date().toISOString()
        }
      }
    );
    
    return res.json({ 
      success: true, 
      message: 'Autorisation révoquée avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la révocation:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour lister toutes les instances (admin seulement)
app.get('/api/instances', checkAdminKey, async (req, res) => {
  try {
    const instances = await authCollection.find({}).toArray();
    
    return res.json({ 
      success: true, 
      instances: instances
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des instances:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour vérifier l'état du serveur
app.get('/api/health', async (req, res) => {
  try {
    const instanceCount = await authCollection.countDocuments();
    
    return res.json({ 
      success: true, 
      message: 'Serveur d\'authentification en ligne',
      timestamp: new Date().toISOString(),
      instanceCount: instanceCount,
      database: 'MongoDB Atlas'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de santé:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Route home
app.get('/', (req, res) => {
  res.send('Serveur d\'authentification Pterodactyl actif avec MongoDB Atlas');
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
