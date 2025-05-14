const express = require('express');
const cors = require('cors');
const app = express();

// For parsing JSON body
app.use(express.json());
// Enable CORS for API requests
app.use(cors());

// In-memory database (you might want to use a real database later)
const botInstances = {};
const MASTER_TOKEN = process.env.MASTER_TOKEN || 'andyy';
const ADMIN_KEY = process.env.ADMIN_KEY || 'andyy';

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

// Simple admin web interface (optional, can be built more robustly later)
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bot Control Panel</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:hover { background-color: #f5f5f5; }
        .actions { display: flex; gap: 10px; }
        button { cursor: pointer; padding: 5px 10px; }
        .authorize { background-color: #4CAF50; color: white; border: none; }
        .revoke { background-color: #f44336; color: white; border: none; }
        .delete { background-color: #ff9800; color: white; border: none; }
        .refresh { margin-bottom: 10px; }
        #adminKey { margin-bottom: 10px; width: 300px; padding: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bot Control Panel</h1>
        </div>
        
        <div>
          <input type="password" id="adminKey" placeholder="Enter Admin Key" />
          <button onclick="loadInstances()" class="refresh">Load Instances</button>
        </div>
        
        <div id="instanceList">
          <p>Enter your admin key and click "Load Instances" to view bot instances.</p>
        </div>
      </div>
      
      <script>
        function loadInstances() {
          const adminKey = document.getElementById('adminKey').value;
          if (!adminKey) {
            alert('Please enter the admin key');
            return;
          }
          
          fetch(\`/api/admin/instances?adminKey=\${adminKey}\`)
            .then(response => response.json())
            .then(data => {
              if (!data.success) {
                alert('Error: ' + data.message);
                return;
              }
              
              const instances = data.instances;
              let html = '<table><tr><th>Instance ID</th><th>User ID</th><th>Device</th><th>Status</th><th>Last Active</th><th>Actions</th></tr>';
              
              for (const id in instances) {
                const instance = instances[id];
                html += \`
                  <tr>
                    <td>\${id}</td>
                    <td>\${instance.userId}</td>
                    <td>\${instance.deviceInfo || 'Unknown'}</td>
                    <td>\${instance.authorized ? 'Authorized' : 'Revoked'}</td>
                    <td>\${new Date(instance.lastActive).toLocaleString()}</td>
                    <td class="actions">
                      <button onclick="authorizeInstance('\${id}', true)" class="authorize">Authorize</button>
                      <button onclick="authorizeInstance('\${id}', false)" class="revoke">Revoke</button>
                      <button onclick="deleteInstance('\${id}')" class="delete">Delete</button>
                    </td>
                  </tr>
                \`;
              }
              
              html += '</table>';
              document.getElementById('instanceList').innerHTML = html;
            })
            .catch(error => alert('Error loading instances: ' + error));
        }
        
        function authorizeInstance(instanceId, authorized) {
          const adminKey = document.getElementById('adminKey').value;
          if (!adminKey) {
            alert('Please enter the admin key');
            return;
          }
          
          fetch('/api/admin/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminKey, instanceId, authorized })
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                alert(data.message);
                loadInstances();
              } else {
                alert('Error: ' + data.message);
              }
            })
            .catch(error => alert('Error: ' + error));
        }
        
        function deleteInstance(instanceId) {
          const adminKey = document.getElementById('adminKey').value;
          if (!adminKey) {
            alert('Please enter the admin key');
            return;
          }
          
          if (!confirm('Are you sure you want to delete this instance?')) {
            return;
          }
          
          fetch(\`/api/admin/instances/\${instanceId}\`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminKey })
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                alert(data.message);
                loadInstances();
              } else {
                alert('Error: ' + data.message);
              }
            })
            .catch(error => alert('Error: ' + error));
        }
      </script>
    </body>
    </html>
  `);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For Vercel