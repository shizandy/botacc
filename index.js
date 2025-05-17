// Système d'authentification par serveur central
const express = require("express");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'bot_auth';
const COLLECTION_NAME = 'auth_instances';

let dbClient = null;
let authCollection = null;

// Fonction pour se connecter à MongoDB avec meilleure gestion d'erreurs
async function connectToMongoDB() {
  // Si déjà connecté, ne rien faire
  if (dbClient && dbClient.topology && dbClient.topology.isConnected()) {
    return;
  }

  try {
    console.log('Tentative de connexion à MongoDB Atlas...');
    dbClient = new MongoClient(MONGODB_URI);
    await dbClient.connect();
    console.log('Connecté avec succès à MongoDB Atlas');
    
    const db = dbClient.db(DB_NAME);
    authCollection = db.collection(COLLECTION_NAME);
    
    // Créer un index pour les recherches efficaces si nécessaire
    await authCollection.createIndex({ botId: 1, phoneNumber: 1, instanceId: 1 });
    
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
          "createdAt": "2025-05-17T11:00:40.000Z",
          "approvedAt": "2025-05-17T11:00:40.000Z",
          "lastPing": "2025-05-17T11:00:40.000Z",
          "expiresAt": null
        }
      ];
      
      const result = await authCollection.insertMany(defaultAuthData);
      console.log(`${result.insertedCount} données par défaut insérées dans MongoDB`);
    }
  } catch (error) {
    console.error('Erreur détaillée de connexion à MongoDB:', error);
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
    res.status(500).json({ 
      success: false, 
      message: 'Erreur de connexion à la base de données',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Appliquer le middleware de connexion à MongoDB à toutes les routes
app.use(ensureDbConnected);

// Route pour valider si un bot est autorisé à s'exécuter
app.post('/api/validate', async (req, res) => {
  console.log('Requête de validation reçue:', req.body);
  const { botId, phoneNumber, instanceId } = req.body;
  
  if (!botId || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID du bot et numéro de téléphone requis' 
    });
  }
  
  try {
    console.log(`Recherche d'autorisation pour botId=${botId}, phoneNumber=${phoneNumber}`);
    
    // MODIFICATION : D'abord chercher par numéro de téléphone, pas besoin d'instanceId
    let auth = await authCollection.findOne({
      botId: botId,
      phoneNumber: phoneNumber,
      status: 'approved' // Cherche seulement les instances approuvées
    });
    
    // Si on trouve une instance approuvée avec ce numéro, on l'utilise
    if (auth) {
      console.log('Autorisation trouvée par numéro de téléphone:', auth);
      
      // Mise à jour du dernier ping
      await authCollection.updateOne(
        { _id: auth._id },
        { $set: { lastPing: new Date().toISOString() } }
      );
      
      // Retourner l'instance existante
      return res.json({ 
        success: true, 
        message: 'Bot autorisé avec instance existante', 
        expiresAt: auth.expiresAt,
        instanceId: auth.instanceId // Retourne l'instanceId existant
      });
    }
    
    // Si aucune instance n'est trouvée par numéro, chercher par instanceId (comportement original)
    if (instanceId) {
      auth = await authCollection.findOne({
        instanceId: instanceId
      });
      
      if (!auth) {
        console.log('Aucune autorisation trouvée');
        return res.status(403).json({ 
          success: false, 
          message: 'Bot non autorisé à s\'exécuter'
        });
      }
      
      console.log('Autorisation trouvée par instanceId:', auth);
      
      // Vérification de l'expiration
      if (auth.expiresAt && new Date(auth.expiresAt) < new Date()) {
        console.log('Autorisation expirée');
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
      
      console.log('Validation réussie, lastPing mis à jour');
      
      return res.json({ 
        success: true, 
        message: 'Bot autorisé', 
        expiresAt: auth.expiresAt
      });
    } else {
      // Si on arrive ici, pas d'instance trouvée ni par numéro ni par instanceId
      return res.status(403).json({
        success: false,
        message: 'Numéro non autorisé et aucun ID d\'instance fourni'
      });
    }
  } catch (error) {
    console.error('Erreur détaillée lors de la validation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour enregistrer un nouveau bot (inscription initiale)
app.post('/api/register', async (req, res) => {
  console.log('Requête d\'enregistrement reçue:', req.body);
  const { botId, phoneNumber, deviceInfo } = req.body;
  
  if (!botId || !phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID du bot et numéro de téléphone requis' 
    });
  }
  
  try {
    // MODIFICATION : Vérifier d'abord si le numéro existe déjà
    const existingAuth = await authCollection.findOne({
      botId: botId,
      phoneNumber: phoneNumber,
      status: 'approved' // Cherche seulement les instances approuvées
    });
    
    // Si une instance approuvée existe déjà, on la retourne
    if (existingAuth) {
      console.log(`Instance approuvée existante trouvée pour le numéro ${phoneNumber}`);
      return res.json({ 
        success: true, 
        message: 'Instance déjà approuvée pour ce numéro',
        instanceId: existingAuth.instanceId,
        alreadyApproved: true // Indique que c'est une instance existante
      });
    }
    
    // Génération d'un ID d'instance unique
    const instanceId = uuidv4();
    console.log(`Nouvel instanceId généré: ${instanceId}`);
    
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
    console.log('Instance enregistrée avec succès');
    
    return res.json({ 
      success: true, 
      message: 'Demande d\'autorisation enregistrée. En attente d\'approbation.', 
      instanceId
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Route pour approuver une demande d'autorisation (admin seulement)
app.post('/api/authorize', checkAdminKey, async (req, res) => {
  console.log('Requête d\'autorisation reçue:', req.body);
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
      console.log(`Date d'expiration définie: ${expiresAt}`);
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
    console.log('Instance approuvée avec succès');
    
    return res.json({ 
      success: true, 
      message: 'Autorisation accordée avec succès',
      authorization: updatedAuth
    });
  } catch (error) {
    console.error('Erreur lors de l\'autorisation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour révoquer une autorisation (admin seulement)
app.post('/api/revoke', checkAdminKey, async (req, res) => {
  console.log('Requête de révocation reçue:', req.body);
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
    
    console.log('Instance révoquée avec succès');
    
    return res.json({ 
      success: true, 
      message: 'Autorisation révoquée avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la révocation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour supprimer définitivement une instance (admin seulement)
app.delete('/api/instance/:instanceId', checkAdminKey, async (req, res) => {
  console.log('Requête de suppression reçue pour instance:', req.params.instanceId);
  const instanceId = req.params.instanceId;
  
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
    
    // Suppression de l'instance
    const result = await authCollection.deleteOne({ instanceId: instanceId });
    
    if (result.deletedCount === 1) {
      console.log('Instance supprimée avec succès');
      
      return res.json({ 
        success: true, 
        message: 'Instance supprimée avec succès' 
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Échec de la suppression de l\'instance'
      });
    }
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'instance:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour lister toutes les instances (admin seulement)
app.get('/api/instances', checkAdminKey, async (req, res) => {
  try {
    const instances = await authCollection.find({}).toArray();
    console.log(`${instances.length} instances récupérées`);
    
    return res.json({ 
      success: true, 
      instances: instances
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des instances:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour vérifier l'état du serveur
app.get('/api/health', async (req, res) => {
  try {
    const instanceCount = await authCollection.countDocuments();
    console.log(`Vérification de santé: ${instanceCount} instances dans la base de données`);
    
    return res.json({ 
      success: true, 
      message: 'Serveur d\'authentification en ligne',
      timestamp: new Date().toISOString(),
      instanceCount: instanceCount,
      database: 'MongoDB Atlas',
      version: '1.3.0' // Version mise à jour pour inclure la suppression d'instance
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
  res.send(`
    <html>
      <head>
        <title>Serveur d'authentification Pterodactyl</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .status { color: green; }
        </style>
      </head>
      <body>
        <h1>Serveur d'authentification Pterodactyl</h1>
        <p>Status: <span class="status">Actif</span></p>
        <p>Système d'authentification pour bots basé sur MongoDB Atlas</p>
        <p>Date: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
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
