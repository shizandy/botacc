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
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
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
      
      const response = await fetch(`/api/admin/instances?adminKey=${adminKey}`);
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
      showToast(`Error: ${error.message}`, 'Error', 'error');
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
        deviceInfo = `${deviceData.platform} ${deviceData.release} (${deviceData.hostname})`;
      } catch {
        // Use default
      }
      
      row.innerHTML = `
        <td>
          <div class="user-id">${instance.userId || 'Unknown'}</div>
          <div class="instance-id">${id}</div>
        </td>
        <td class="device-info" title="${instance.deviceInfo || 'Unknown'}">${deviceInfo}</td>
        <td>
          <span class="status-badge ${instance.authorized ? 'status-authorized' : 'status-revoked'}">
            <i class="fas ${instance.authorized ? 'fa-check-circle' : 'fa-ban'}"></i>
            ${instance.authorized ? 'Authorized' : 'Revoked'}
          </span>
        </td>
        <td class="timestamp" title="${instance.lastActive || 'Unknown'}">${formatDate(instance.lastActive)}</td>
        <td class="instance-actions">
          ${instance.authorized ? 
            `<button class="action-btn revoke-btn" data-id="${id}" title="Revoke Access"><i class="fas fa-ban"></i></button>` : 
            `<button class="action-btn authorize-btn" data-id="${id}" title="Authorize Access"><i class="fas fa-check"></i></button>`
          }
          <button class="action-btn delete-btn" data-id="${id}" title="Delete Instance"><i class="fas fa-trash"></i></button>
        </td>
      `;
      
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
            ? `Instance ${instanceId === 'all' ? 'all' : instanceId} authorized successfully`
            : `Instance ${instanceId === 'all' ? 'all' : instanceId} access revoked`,
          'Success',
          'success'
        );
      } else {
        showToast(data.message || 'Operation failed', 'Error', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'Error', 'error');
    } finally {
      hideLoader();
    }
  };
  
  const deleteInstance = async (instanceId) => {
    try {
      showLoader();
      
      const response = await fetch(`/api/admin/instances/${instanceId}`, {
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
        
        showToast(`Instance ${instanceId} deleted successfully`, 'Success', 'success');
      } else {
        showToast(data.message || 'Deletion failed', 'Error', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'Error', 'error');
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