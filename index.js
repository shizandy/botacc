const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// For parsing JSON body
app.use(express.json());
// Enable CORS for API requests
app.use(cors());
// Serve static files (CSS, JS)
app.use(express.static(__dirname));

// In-memory database (you might want to use a real database later)
const botInstances = {};
const MASTER_TOKEN = process.env.MASTER_TOKEN || 'your-default-secret-token';
const ADMIN_KEY = process.env.ADMIN_KEY || 'your-admin-secret';

// Home route for checking if server is online
app.get('/', (req, res) => {
  res.json({ status: 'Bot Control Server is running' });
});

// Register a new bot instance
app.post('/api/register', (req, res) => {
  const { instanceId, userId, deviceInfo, authToken } = req.body;
  
  if (!instanceId || !userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required parameters' 
    });
  }
  
  // Verify the authentication token
  if (authToken !== MASTER_TOKEN) {
    console.log('Unauthorized registration attempt:', { instanceId, userId });
    return res.status(403).json({ 
      success: false, 
      authorized: false, 
      message: 'Invalid authentication token' 
    });
  }
  
  // Store the instance with default authorized status
  botInstances[instanceId] = {
    userId,
    deviceInfo: deviceInfo || 'Unknown device',
    authorized: true, // You can change this to false to require manual approval
    registeredAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };
  
  console.log('New bot registered:', { instanceId, userId });
  
  return res.json({ 
    success: true, 
    authorized: botInstances[instanceId].authorized,
    message: 'Registration successful' 
  });
});

// Heartbeat endpoint for bots to check their authorization status
app.post('/api/heartbeat', (req, res) => {
  const { instanceId } = req.body;
  
  if (!instanceId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing instance ID' 
    });
  }
  
  // Check if this instance exists and is authorized
  if (!botInstances[instanceId]) {
    return res.status(404).json({ 
      success: false, 
      authorized: false, 
      message: 'Instance not found' 
    });
  }
  
  // Update last active timestamp
  botInstances[instanceId].lastActive = new Date().toISOString();
  
  // Return authorization status
  return res.json({
    success: true,
    authorized: botInstances[instanceId].authorized,
    message: botInstances[instanceId].authorized ? 
      'Instance is authorized' : 'Access has been revoked'
  });
});

// List all registered bot instances (admin only)
app.get('/api/admin/instances', (req, res) => {
  const { adminKey } = req.query;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }
  
  return res.json({ 
    success: true, 
    instances: botInstances 
  });
});

// Revoke or grant access to specific instances (admin only)
app.post('/api/admin/authorize', (req, res) => {
  const { adminKey, instanceId, authorized } = req.body;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }
  
  if (instanceId === 'all') {
    // Update all instances
    Object.keys(botInstances).forEach(id => {
      botInstances[id].authorized = Boolean(authorized);
    });
    
    return res.json({ 
      success: true, 
      message: `All instances are now ${authorized ? 'authorized' : 'unauthorized'}` 
    });
  } 
  else if (botInstances[instanceId]) {
    // Update specific instance
    botInstances[instanceId].authorized = Boolean(authorized);
    
    return res.json({ 
      success: true, 
      message: `Instance ${instanceId} is now ${authorized ? 'authorized' : 'unauthorized'}` 
    });
  } 
  else {
    return res.status(404).json({ 
      success: false, 
      message: 'Instance not found' 
    });
  }
});

// Delete a bot instance (admin only)
app.delete('/api/admin/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const { adminKey } = req.body;
  
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized access' 
    });
  }
  
  if (!botInstances[instanceId]) {
    return res.status(404).json({ 
      success: false, 
      message: 'Instance not found' 
    });
  }
  
  // Remove the instance
  delete botInstances[instanceId];
  
  return res.json({ 
    success: true, 
    message: `Instance ${instanceId} has been deleted` 
  });
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For Vercel