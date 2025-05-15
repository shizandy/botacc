// Replace your current app.get('/admin', ...) route with this code in your index.js file

app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bot Control Panel | Admin Dashboard</title>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
      <style>
        :root {
          --bg-primary: #121212;
          --bg-secondary: #1e1e1e;
          --bg-tertiary: #2d2d2d;
          --text-primary: #f0f0f0;
          --text-secondary: #a0a0a0;
          --accent-primary: #8c52ff;
          --accent-secondary: #5928e5;
          --success: #00c853;
          --warning: #ff9100;
          --danger: #ff1744;
          --info: #00b0ff;
          --border-radius: 8px;
          --box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
          --transition: all 0.3s ease;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
        }
        
        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }
        
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .header {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          padding: 30px;
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.8s ease;
        }
        
        .header h1 {
          font-size: 2rem;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
        }
        
        .header p {
          opacity: 0.8;
          position: relative;
          z-index: 1;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
          transform: rotate(45deg);
          animation: shimmer 10s infinite linear;
        }
        
        .auth-panel {
          background-color: var(--bg-secondary);
          padding: 20px;
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          display: flex;
          flex-direction: column;
          gap: 15px;
          animation: slideUp 0.6s ease;
        }
        
        .auth-panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .auth-panel-header i {
          font-size: 1.5rem;
          color: var(--accent-primary);
        }
        
        .auth-panel-header h2 {
          font-size: 1.5rem;
        }
        
        .input-group {
          position: relative;
          width: 100%;
        }
        
        .input-group input {
          width: 100%;
          padding: 15px;
          padding-left: 50px;
          border: none;
          border-radius: var(--border-radius);
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 1rem;
          transition: var(--transition);
          outline: 2px solid transparent;
        }
        
        .input-group input:focus {
          outline: 2px solid var(--accent-primary);
        }
        
        .input-group i {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--accent-primary);
          font-size: 1.2rem;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: var(--border-radius);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
        }
        
        .btn-primary {
          background-color: var(--accent-primary);
          color: white;
        }
        
        .btn-primary:hover {
          background-color: var(--accent-secondary);
          transform: translateY(-2px);
        }
        
        .btn-secondary {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
        
        .btn-secondary:hover {
          background-color: #3d3d3d;
          transform: translateY(-2px);
        }
        
        .btn i {
          font-size: 1.1rem;
        }
        
        .status-panel {
          background-color: var(--bg-secondary);
          padding: 0;
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          overflow: hidden;
          display: none;
          animation: slideUp 0.8s ease;
        }
        
        .status-panel-header {
          padding: 20px;
          background-color: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .status-panel-header h2 {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .status-panel-header h2 i {
          color: var(--accent-primary);
        }
        
        .status-controls {
          display: flex;
          gap: 15px;
        }
        
        .status-controls button {
          background-color: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1.1rem;
          transition: var(--transition);
          display: flex;
          align-items: center;
          padding: 5px;
        }
        
        .status-controls button:hover {
          color: var(--text-primary);
          transform: scale(1.1);
        }
        
        .status-panel-body {
          padding: 0;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .status-panel-body::-webkit-scrollbar {
          width: 8px;
        }
        
        .status-panel-body::-webkit-scrollbar-track {
          background: var(--bg-secondary);
        }
        
        .status-panel-body::-webkit-scrollbar-thumb {
          background: var(--bg-tertiary);
          border-radius: 10px;
        }
        
        .status-panel-body::-webkit-scrollbar-thumb:hover {
          background: var(--accent-secondary);
        }
        
        .instance-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .instance-table th {
          background-color: var(--bg-tertiary);
          padding: 15px;
          text-align: left;
          color: var(--text-secondary);
          font-weight: 500;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .instance-table td {
          padding: 15px;
          border-bottom: 1px solid var(--bg-tertiary);
        }
        
        .instance-table tr {
          transition: var(--transition);
        }
        
        .instance-table tr:hover {
          background-color: rgba(140, 82, 255, 0.1);
        }
        
        .instance-table tr:last-child td {
          border-bottom: none;
        }
        
        .instance-id {
          font-family: monospace;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        
        .user-id {
          font-weight: 500;
        }
        
        .device-info {
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 500;
          gap: 5px;
        }
        
        .status-authorized {
          background-color: rgba(0, 200, 83, 0.15);
          color: var(--success);
        }
        
        .status-revoked {
          background-color: rgba(255, 23, 68, 0.15);
          color: var(--danger);
        }
        
        .timestamp {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        
        .instance-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          border: none;
          border-radius: var(--border-radius);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
          font-size: 1rem;
          color: white;
        }
        
        .authorize-btn {
          background-color: var(--success);
        }
        
        .authorize-btn:hover {
          background-color: #00b34a;
          transform: translateY(-2px);
        }
        
        .revoke-btn {
          background-color: var(--danger);
        }
        
        .revoke-btn:hover {
          background-color: #f01542;
          transform: translateY(-2px);
        }
        
        .delete-btn {
          background-color: var(--warning);
        }
        
        .delete-btn:hover {
          background-color: #f08300;
          transform: translateY(-2px);
        }
        
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: var(--text-secondary);
        }
        
        .empty-state i {
          font-size: 3rem;
          margin-bottom: 20px;
          opacity: 0.6;
        }
        
        .empty-state p {
          font-size: 1.2rem;
          margin-bottom: 10px;
        }
        
        .empty-state span {
          font-size: 0.9rem;
        }
        
        .toast {
          position: fixed;
          bottom: 30px;
          right: 30px;
          padding: 15px 25px;
          background-color: var(--bg-secondary);
          border-left: 5px solid var(--accent-primary);
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          display: flex;
          align-items: center;
          gap: 15px;
          transform: translateX(150%);
          transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
          z-index: 1000;
        }
        
        .toast.show {
          transform: translateX(0);
        }
        
        .toast i {
          font-size: 1.5rem;
        }
        
        .toast i.success {
          color: var(--success);
        }
        
        .toast i.error {
          color: var(--danger);
        }
        
        .toast i.warning {
          color: var(--warning);
        }
        
        .toast i.info {
          color: var(--info);
        }
        
        .toast-content h3 {
          font-size: 1rem;
          margin-bottom: 5px;
        }
        
        .toast-content p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        
        .loader-container {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 999;
          justify-content: center;
          align-items: center;
        }
        
        .loader {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 5px solid transparent;
          border-top-color: var(--accent-primary);
          border-bottom-color: var(--accent-secondary);
          animation: spin 1.5s linear infinite;
        }
        
        .loader::before, .loader::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          border: 5px solid transparent;
        }
        
        .loader::before {
          top: 5px;
          left: 5px;
          right: 5px;
          bottom: 5px;
          border-top-color: var(--info);
          border-bottom-color: var(--warning);
          animation: spin 2s linear infinite reverse;
        }
        
        .loader::after {
          top: 15px;
          left: 15px;
          right: 15px;
          bottom: 15px;
          border-top-color: var(--danger);
          border-bottom-color: var(--success);
          animation: spin 1s linear infinite;
        }
        
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .modal.show {
          opacity: 1;
        }
        
        .modal-content {
          background-color: var(--bg-secondary);
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          width: 90%;
          max-width: 500px;
          padding: 25px;
          transform: translateY(50px);
          transition: transform 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        }
        
        .modal.show .modal-content {
          transform: translateY(0);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .modal-header h2 {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .modal-header i {
          color: var(--danger);
        }
        
        .modal-header button {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
        }
        
        .modal-header button:hover {
          color: var(--text-primary);
          transform: rotate(90deg);
        }
        
        .modal-body {
          margin-bottom: 20px;
        }
        
        .modal-body p {
          margin-bottom: 15px;
          line-height: 1.6;
        }
        
        .modal-body .instance-id {
          display: inline-block;
          padding: 5px 10px;
          background-color: var(--bg-tertiary);
          border-radius: var(--border-radius);
          margin-top: 10px;
          font-family: monospace;
        }
        
        .modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .modal-btn {
          padding: 10px 20px;
          border: none;
          border-radius: var(--border-radius);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: var(--transition);
        }
        
        .modal-btn-cancel {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
        
        .modal-btn-cancel:hover {
          background-color: #3d3d3d;
        }
        
        .modal-btn-confirm {
          background-color: var(--danger);
          color: white;
        }
        
        .modal-btn-confirm:hover {
          background-color: #f01542;
        }
        
        .global-actions {
          background-color: var(--bg-secondary);
          padding: 20px;
          border-radius: var(--border-radius);
          box-shadow: var(--box-shadow);
          margin-top: 20px;
          display: none;
          animation: slideUp 0.8s ease;
        }
        
        .global-actions-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .global-actions-header i {
          font-size: 1.5rem;
          color: var(--accent-primary);
        }
        
        .global-actions-header h2 {
          font-size: 1.5rem;
        }
        
        .global-actions-body {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .global-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 20px;
          border-radius: var(--border-radius);
          cursor: pointer;
          flex: 1;
          min-width: 200px;
          transition: var(--transition);
          border: none;
          font-size: 1rem;
          font-weight: 500;
        }
        
        .global-btn-authorize {
          background-color: rgba(0, 200, 83, 0.15);
          color: var(--success);
        }
        
        .global-btn-authorize:hover {
          background-color: rgba(0, 200, 83, 0.3);
          transform: translateY(-2px);
        }
        
        .global-btn-revoke {
          background-color: rgba(255, 23, 68, 0.15);
          color: var(--danger);
        }
        
        .global-btn-revoke:hover {
          background-color: rgba(255, 23, 68, 0.3);
          transform: translateY(-2px);
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
          display: none;
          animation: fadeIn 0.8s ease;
        }
        
        .summary-card {
          background-color: var(--bg-secondary);
          border-radius: var(--border-radius);
          padding: 20px;
          box-shadow: var(--box-shadow);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: var(--transition);
        }
        
        .summary-card:hover {
          transform: translateY(-5px);
        }
        
        .summary-card-icon {
          position: absolute;
          right: 20px;
          top: 20px;
          font-size: 2rem;
          opacity: 0.2;
        }
        
        .summary-card h3 {
          font-size: 1.1rem;
          margin-bottom: 15px;
          color: var(--text-secondary);
        }
        
        .summary-card-value {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .summary-card-authorized .summary-card-value {
          color: var(--success);
        }
        
        .summary-card-revoked .summary-card-value {
          color: var(--danger);
        }
        
        .summary-card-total .summary-card-value {
          color: var(--info);
        }
        
        .summary-card-active .summary-card-value {
          color: var(--accent-primary);
        }
        
        .summary-card-trend {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.9rem;
        }
        
        .summary-card-trend i {
          font-size: 1rem;
        }
        
        .summary-card-trend-up {
          color: var(--success);
        }
        
        .summary-card-trend-down {
          color: var(--danger);
        }
        
        .footer {
          margin-top: 40px;
          padding: 20px 0;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.9rem;
          animation: fadeIn 1s ease;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: rotate(0) translate(-50%, -50%);
          }
          100% {
            transform: rotate(360deg) translate(-50%, -50%);
          }
        }
        
        @media (max-width: 768px) {
          .header {
            padding: 20px;
          }
          
          .header h1 {
            font-size: 1.8rem;
          }
          
          .button-group {
            flex-direction: column;
          }
          
          .status-panel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          
          .status-controls {
            width: 100%;
            justify-content: flex-end;
          }
          
          .instance-table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }
          
          .modal-content {
            width: 95%;
            padding: 20px;
          }
          
          .global-actions-body {
            flex-direction: column;
          }
          
          .summary-cards {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="dashboard">
          <header class="header">
            <h1>Bot Control Panel</h1>
            <p>Manage and monitor all bot instances from a central dashboard</p>
          </header>
          
          <div class="auth-panel">
            <div class="auth-panel-header">
              <i class="fas fa-lock"></i>
              <h2>Authentication</h2>
            </div>
            <div class="input-group">
              <i class="fas fa-key"></i>
              <input type="password" id="adminKey" placeholder="Enter Admin Key" autocomplete="off">
            </div>
            <div class="button-group">
              <button id="loadBtn" class="btn btn-primary">
                <i class="fas fa-sign-in-alt"></i>
                <span>Login</span>
              </button>
              <button id="clearBtn" class="btn btn-secondary">
                <i class="fas fa-trash"></i>
                <span>Clear</span>
              </button>
            </div>
          </div>
          
          <div id="summaryCards" class="summary-cards">
            <div class="summary-card summary-card-total">
              <i class="fas fa-robot summary-card-icon"></i>
              <h3>Total Instances</h3>
              <div id="totalCount" class="summary-card-value">0</div>
              <div class="summary-card-trend summary-card-trend-up">
                <i class="fas fa-arrow-up"></i>
                <span>Since last login</span>
              </div>
            </div>
            
            <div class="summary-card summary-card-authorized">
              <i class="fas fa-check-circle summary-card-icon"></i>
              <h3>Authorized</h3>
              <div id="authorizedCount" class="summary-card-value">0</div>
              <div class="summary-card-trend summary-card-trend-up">
                <i class="fas fa-arrow-up"></i>
                <span>Active instances</span>
              </div>
            </div>
            
            <div class="summary-card summary-card-revoked">
              <i class="fas fa-ban summary-card-icon"></i>
              <h3>Revoked</h3>
              <div id="revokedCount" class="summary-card-value">0</div>
              <div class="summary-card-trend summary-card-trend-down">
                <i class="fas fa-arrow-down"></i>
                <span>Disabled instances</span>
              </div>
            </div>
            
            <div class="summary-card summary-card-active">
              <i class="fas fa-signal summary-card-icon"></i>
              <h3>Recently Active</h3>
              <div id="activeCount" class="summary-card-value">0</div>
              <div class="summary-card-trend">
                <i class="fas fa-clock"></i>
                <span>Last 24 hours</span>
              </div>
            </div>
          </div>
          
          <div id="globalActions" class="global-actions">
            <div class="global-actions-header">
              <i class="fas fa-th-large"></i>
              <h2>Global Actions</h2>
            </div>
            <div class="global-actions-body">
              <button id="authorizeAllBtn" class="global-btn global-btn-authorize">
                <i class="fas fa-check-circle"></i>
                <span>Authorize All Instances</span>
              </button>
              <button id="revokeAllBtn" class="global-btn global-btn-revoke">
                <i class="fas fa-ban"></i>
                <span>Revoke All Instances</span>
              </button>
            </div>
          </div>
          
          <div id="statusPanel" class="status-panel">
            <div class="status-panel-header">
              <h2>
                <i class="fas fa-list"></i>
                <span>Bot Instances</span>
              </h2>
              <div class="status-controls">
                <button id="refreshBtn" title="Refresh">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
            <div class="status-panel-body">
              <table class="instance-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="instanceTableBody">
                  <!-- Table rows will be added dynamically -->
                </tbody>
              </table>
              <div id="emptyState" class="empty-state">
                <i class="fas fa-robot"></i>
                <p>No bot instances found</p>
                <span>Instances will appear here when bots register with your server</span>
              </div>
            </div>
          </div>
          
          <footer class="footer">
            <p>&copy; 2023 Bot Control Panel | Secure Remote Management System</p>
          </footer>
        </div>
      </div>
      
      <div id="toast" class="toast">
        <i class="fas fa-info-circle info"></i>
        <div class="toast-content">
          <h3>Notification</h3>
          <p>This is a notification message.</p>
        </div>
      </div>
      
      <div id="loaderContainer" class="loader-container">
        <div class="loader"></div>
      </div>
      
      <div id="deleteModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2><i class="fas fa-exclamation-triangle"></i> Confirm Deletion</h2>
            <button id="closeModalBtn">&times;</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this bot instance?</p>
            <p>This action cannot be undone and will permanently remove the instance from your system.</p>
            <div id="deleteInstanceId" class="instance-id"></div>
          </div>
          <div class="modal-footer">
            <button id="cancelDeleteBtn" class="modal-btn modal-btn-cancel">Cancel</button>
            <button id="confirmDeleteBtn" class="modal-btn modal-btn-confirm">Delete</button>
          </div>
        </div>
      </div>
      
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const adminKeyInput = document.getElementById('adminKey');
          const loadBtn = document.getElementById('loadBtn');
          const clearBtn = document.getElementById('clearBtn');
          const statusPanel = document.getElementById('statusPanel');
          const instanceTableBody = document.getElementById('instanceTableBody');
          const emptyState = document.getElementById('emptyState');
          const refreshBtn = document.getElementById('refreshBtn');
          const toast = document.getElementById('toast');
          const loaderContainer = document.getElementById('loaderContainer');
          const deleteModal = document.getElementById('deleteModal');
          const closeModalBtn = document.getElementById('closeModalBtn');
          const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
          const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
          const deleteInstanceId = document.getElementById('deleteInstanceId');
          const authorizeAllBtn = document.getElementById('authorizeAllBtn');
          const revokeAllBtn = document.getElementById('revokeAllBtn');
          const summaryCards = document.getElementById('summaryCards');
          const globalActions = document.getElementById('globalActions');
          const totalCount = document.getElementById('totalCount');
          const authorizedCount = document.getElementById('authorizedCount');
          const revokedCount = document.getElementById('revokedCount');
          const activeCount = document.getElementById('activeCount');
          
          let currentInstanceId = null;
          let instances = {};
          let adminKey = localStorage.getItem('adminKey') || '';
          
          if (adminKey) {
            adminKeyInput.value = adminKey;
          }
          
          const showLoader = () => {
            loaderContainer.style.display = 'flex';
          };
          
          const hideLoader = () => {
            loaderContainer.style.display = 'none';
          };
          
          const showToast = (message, title = 'Notification', type = 'info') => {
            const iconElement = toast.querySelector('i');
            iconElement.className = '';
            iconElement.classList.add('fas');
            
            switch (type) {
              case 'success':
                iconElement.classList.add('fa-check-circle', 'success');
                break;
              case 'error':
                iconElement.classList.add('fa-times-circle', 'error');
                break;
              case 'warning':
                iconElement.classList.add('fa-exclamation-triangle', 'warning');
                break;
              default:
                iconElement.classList.add('fa-info-circle', 'info');
            }
            
            toast.querySelector('h3').textContent = title;
            toast.querySelector('p').textContent = message;
            
            toast.classList.add('show');
            
            setTimeout(() => {
              toast.classList.remove('show');
            }, 5000);
          };
          
          const formatDate = (dateString) => {
            try {
              const date = new Date(dateString);
              const now = new Date();
              const diffMs = now - date;
              const diffSec = Math.floor(diffMs / 1000);
              const diffMin = Math.floor(diffSec / 60);
              const diffHours = Math.floor(diffMin / 60);
              const diffDays = Math.floor(diffHours / 24);
              
              if (diffSec < 60) {
                return 'Just now';
              } else if (diffMin < 60) {
                return \`\${diffMin} minute\${diffMin === 1 ? '' : 's'} ago\`;
              } else if (diffHours < 24) {
                return \`\${diffHours} hour\${diffHours === 1 ? '' : 's'} ago\`;
              } else if (diffDays < 7) {
                return \`\${diffDays} day\${diffDays === 1 ? '' : 's'} ago\`;
              } else {
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
              }
            } catch (error) {
              return dateString || 'Unknown';
            }
          };
          
          const loadInstances = async () => {
            try {
              adminKey = adminKeyInput.value;
              if (!adminKey) {
                showToast('Please enter the admin key', 'Authentication Required', 'warning');
                return;
              }
              
              localStorage.setItem('adminKey', adminKey);
              
              showLoader();
              
              const response = await fetch(\`/api/admin/instances?adminKey=\${adminKey}\`);
              const data = await response.json();
              
              if (!data.success) {
                showToast(data.message || 'Authentication failed', 'Error', 'error');
                return;
              }
              
              instances = data.instances || {};
              updateInstanceTable();
              updateSummary();
              
              statusPanel.style.display = 'block';
              summaryCards.style.display = 'grid';
              globalActions.style.display = 'block';
              
              showToast('Instances loaded successfully', 'Success', 'success');
            } catch (error) {
              showToast(\`Error: \${error.message}\`, 'Error', 'error');
            } finally {
              hideLoader();
            }
          };
          
          const updateSummary = () => {
            const instanceArray = Object.values(instances);
            const total = instanceArray.length;
            const authorized = instanceArray.filter(inst => inst.authorized).length;
            const revoked = total - authorized;
            
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            const active = instanceArray.filter(inst => {
              try {
                const lastActive = new Date(inst.lastActive);
                return lastActive >= oneDayAgo;
              } catch {
                return false;
              }
            }).length;
            
            totalCount.textContent = total;
            authorizedCount.textContent = authorized;
            revokedCount.textContent = revoked;
            activeCount.textContent = active;
          };
          
          const updateInstanceTable = () => {
            const instanceArray = Object.entries(instances);
            
            if (instanceArray.length === 0) {
              instanceTableBody.innerHTML = '';
              emptyState.style.display = 'block';
              return;
            }
            
            emptyState.style.display = 'none';
            instanceTableBody.innerHTML = '';
            
            instanceArray.sort((a, b) => {
              try {
                const dateA = new Date(a[1].lastActive);
                const dateB = new Date(b[1].lastActive);
                return dateB - dateA; // Most recent first
              } catch {
                return 0;
              }
            });
            
            instanceArray.forEach(([id, instance]) => {
              const row = document.createElement('tr');
              
              // Format device info
              let deviceInfo = 'Unknown device';
              try {
                const deviceData = JSON.parse(instance.deviceInfo);
                deviceInfo = \`\${deviceData.platform} \${deviceData.release} (\${deviceData.hostname})\`;
              } catch {
                // Use default
              }
              
              row.innerHTML = \`
                <td>
                  <div class="user-id">\${instance.userId || 'Unknown'}</div>
                  <div class="instance-id">\${id}</div>
                </td>
                <td class="device-info" title="\${instance.deviceInfo || 'Unknown'}">\${deviceInfo}</td>
                <td>
                  <span class="status-badge \${instance.authorized ? 'status-authorized' : 'status-revoked'}">
                    <i class="fas \${instance.authorized ? 'fa-check-circle' : 'fa-ban'}"></i>
                    \${instance.authorized ? 'Authorized' : 'Revoked'}
                  </span>
                </td>
                <td class="timestamp" title="\${instance.lastActive || 'Unknown'}">\${formatDate(instance.lastActive)}</td>
                <td class="instance-actions">
                  \${instance.authorized ? 
                    \`<button class="action-btn revoke-btn" data-id="\${id}" title="Revoke Access"><i class="fas fa-ban"></i></button>\` : 
                    \`<button class="action-btn authorize-btn" data-id="\${id}" title="Authorize Access"><i class="fas fa-check"></i></button>\`
                  }
                  <button class="action-btn delete-btn" data-id="\${id}" title="Delete Instance"><i class="fas fa-trash"></i></button>
                </td>
              \`;
              
              // Add event listeners for action buttons
              const authorizeBtn = row.querySelector('.authorize-btn');
              const revokeBtn = row.querySelector('.revoke-btn');
              const deleteBtn = row.querySelector('.delete-btn');
              
              if (authorizeBtn) {
                authorizeBtn.addEventListener('click', () => authorizeInstance(id, true));
              }
              
              if (revokeBtn) {
                revokeBtn.addEventListener('click', () => authorizeInstance(id, false));
              }
              
              if (deleteBtn) {
                deleteBtn.addEventListener('click', () => openDeleteModal(id));
              }
              
              instanceTableBody.appendChild(row);
            });
          };
          
          const authorizeInstance = async (instanceId, authorized) => {
            try {
              showLoader();
              
              const response = await fetch('/api/admin/authorize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  adminKey,
                  instanceId,
                  authorized
                })
              });
              
              const data = await response.json();
              
              if (data.success) {
                if (instanceId === 'all') {
                  Object.keys(instances).forEach(id => {
                    instances[id].authorized = authorized;
                  });
                } else if (instances[instanceId]) {
                  instances[instanceId].authorized = authorized;
                }
                
                updateInstanceTable();
                updateSummary();
                
                showToast(
                  authorized 
                    ? \`Instance \${instanceId === 'all' ? 'all' : instanceId} authorized successfully\`
                    : \`Instance \${instanceId === 'all' ? 'all' : instanceId} access revoked\`,
                  'Success',
                  'success'
                );
              } else {
                showToast(data.message || 'Operation failed', 'Error', 'error');
              }
            } catch (error) {
              showToast(\`Error: \${error.message}\`, 'Error', 'error');
            } finally {
              hideLoader();
            }
          };
          
          const deleteInstance = async (instanceId) => {
            try {
              showLoader();
              
              const response = await fetch(\`/api/admin/instances/\${instanceId}\`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  adminKey
                })
              });
              
              const data = await response.json();
              
              if (data.success) {
                delete instances[instanceId];
                updateInstanceTable();
                updateSummary();
                
                showToast(\`Instance \${instanceId} deleted successfully\`, 'Success', 'success');
              } else {
                showToast(data.message || 'Deletion failed', 'Error', 'error');
              }
            } catch (error) {
              showToast(\`Error: \${error.message}\`, 'Error', 'error');
            } finally {
              hideLoader();
              closeDeleteModal();
            }
          };
          
          const openDeleteModal = (instanceId) => {
            currentInstanceId = instanceId;
            deleteInstanceId.textContent = instanceId;
            deleteModal.style.display = 'flex';
            setTimeout(() => {
              deleteModal.classList.add('show');
            }, 10);
          };
          
          const closeDeleteModal = () => {
            deleteModal.classList.remove('show');
            setTimeout(() => {
              deleteModal.style.display = 'none';
              currentInstanceId = null;
            }, 300);
          };
          
          // Event Listeners
          loadBtn.addEventListener('click', loadInstances);
          
          clearBtn.addEventListener('click', () => {
            adminKeyInput.value = '';
            localStorage.removeItem('adminKey');
          });
          
          refreshBtn.addEventListener('click', loadInstances);
          
          adminKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              loadInstances();
            }
          });
          
          closeModalBtn.addEventListener('click', closeDeleteModal);
          cancelDeleteBtn.addEventListener('click', closeDeleteModal);
          
          confirmDeleteBtn.addEventListener('click', () => {
            if (currentInstanceId) {
              deleteInstance(currentInstanceId);
            }
          });
          
          authorizeAllBtn.addEventListener('click', () => {
            if (Object.keys(instances).length > 0) {
              authorizeInstance('all', true);
            } else {
              showToast('No instances to authorize', 'Warning', 'warning');
            }
          });
          
          revokeAllBtn.addEventListener('click', () => {
            if (Object.keys(instances).length > 0) {
              authorizeInstance('all', false);
            } else {
              showToast('No instances to revoke', 'Warning', 'warning');
            }
          });
          
          // Auto-load on startup if admin key is saved
          if (adminKey) {
            loadInstances();
          }
        });
      </script>
    </body>
    </html>
  `);
});
