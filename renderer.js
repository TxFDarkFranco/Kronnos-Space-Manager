const { ipcRenderer } = require('electron');

let appData = [];
let currentSort = 'size';

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
  });
});

function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Load Drives
async function loadDrives() {
  const drivesContainer = document.getElementById('drives-list');
  const drives = await ipcRenderer.invoke('get-drives');
  
  drivesContainer.innerHTML = '';
  
  if(drives.length === 0) {
    drivesContainer.innerHTML = '<div style="color:var(--danger)">No drives detected or error reading drives. Try running as Administrator.</div>';
    return;
  }

  drives.forEach(drive => {
    let size = drive.Size || 0;
    let fallbackSize = drive.SizeRemaining || 0;
    
    let used = size - fallbackSize;
    let percentage = size > 0 ? (used / size) * 100 : 0;
    
    let pColor = 'var(--accent)';
    let bShadow = 'var(--accent-glow)';
    // Colors indicating critical disk capacity
    if(percentage > 90) {
       pColor = 'var(--danger)'; 
       bShadow = 'rgba(255, 0, 85, 0.4)';
    } else if (percentage > 75) {
       pColor = 'var(--warning)';
       bShadow = 'rgba(255, 183, 0, 0.4)';
    }

    const card = document.createElement('div');
    card.className = 'drive-card';
    card.innerHTML = `
      <div class="drive-header">
         <svg class="drive-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M6 8h.01"></path><path d="M10 8h.01"></path></svg>
         Local Disk (${drive.DriveLetter}:)
      </div>
      <div class="progress-bar-bg">
         <div class="progress-bar-fill" style="width: 0%; background: ${pColor}; box-shadow: 0 0 10px ${bShadow};" data-target="${percentage}"></div>
      </div>
      <div class="drive-stats">
         <span>${formatBytes(used)} Used</span>
         <span>${formatBytes(size)} Total</span>
      </div>
    `;
    drivesContainer.appendChild(card);
  });

  // Animate progress bars
  setTimeout(() => {
     document.querySelectorAll('.progress-bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-target') + '%';
     });
  }, 100);
}

// Load Apps
async function loadApps() {
  const result = await ipcRenderer.invoke('get-installed-apps');
  
  appData = result.map(app => {
    let sizeBytes = 0;
    if (app.EstimatedSize) {
      sizeBytes = app.EstimatedSize * 1024; // Convert KB to Bytes from registry
    }
    return {
      name: app.DisplayName || 'Unknown',
      version: app.DisplayVersion || 'N/A',
      publisher: app.Publisher || 'Unknown',
      size: sizeBytes,
      location: app.InstallLocation || null,
      iconString: app.DisplayIcon || null,
      uninstallString: app.UninstallString || null
    };
  });

  document.getElementById('stat-total-apps').innerText = appData.length;
  
  let maxApp = appData.reduce((prev, current) => (prev.size > current.size) ? prev : current, {size: 0});
  document.getElementById('stat-largest-app').innerText = maxApp && maxApp.size > 0 ? maxApp.name : '--';

  renderApps();
}

// We store the current filtered list here so event handlers can reference apps by index
let currentFilteredList = [];

function renderApps(searchTerm = '') {
  let filtered = [...appData];
  if (searchTerm) {
     filtered = filtered.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.publisher.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  if (currentSort === 'size') {
     filtered.sort((a,b) => b.size - a.size);
  } else if (currentSort === 'name') {
     filtered.sort((a,b) => a.name.localeCompare(b.name));
  }

  currentFilteredList = filtered;

  const tbody = document.getElementById('app-table-body');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
     tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No applications found matching criteria.</td></tr>';
     return;
  }

  for (let i = 0; i < filtered.length; i++) {
    const app = filtered[i];
    const tr = document.createElement('tr');
    
    const iconId = 'icon-' + Math.random().toString(36).substr(2, 9);
    
    // Build action buttons via DOM instead of inline onclick to avoid escaping issues
    const tdName = document.createElement('td');
    tdName.style.cssText = 'font-weight: 600; display: flex; align-items: center; gap: 12px;';
    const img = document.createElement('img');
    img.id = iconId;
    img.style.cssText = 'width: 24px; height: 24px; border-radius: 4px; display: none;';
    tdName.appendChild(img);
    tdName.appendChild(document.createTextNode(app.name));

    const tdPublisher = document.createElement('td');
    tdPublisher.style.color = 'var(--text-muted)';
    tdPublisher.textContent = app.publisher;

    const tdVersion = document.createElement('td');
    tdVersion.style.color = 'var(--text-muted)';
    tdVersion.textContent = app.version;

    const tdSize = document.createElement('td');
    tdSize.style.cssText = 'color: var(--accent); font-weight: 600;';
    tdSize.textContent = app.size > 0 ? formatBytes(app.size) : 'Unknown';

    const tdActions = document.createElement('td');
    tdActions.style.cssText = 'display: flex; gap: 8px;';

    if (app.location) {
      const btnFolder = document.createElement('button');
      btnFolder.className = 'btn-action';
      btnFolder.textContent = 'Folder';
      btnFolder.dataset.action = 'folder';
      btnFolder.dataset.index = i;
      tdActions.appendChild(btnFolder);
    }

    if (app.uninstallString) {
      const btnUninstall = document.createElement('button');
      btnUninstall.className = 'btn-action btn-danger';
      btnUninstall.textContent = 'Uninstall';
      btnUninstall.dataset.action = 'uninstall';
      btnUninstall.dataset.index = i;
      tdActions.appendChild(btnUninstall);
    }

    tr.appendChild(tdName);
    tr.appendChild(tdPublisher);
    tr.appendChild(tdVersion);
    tr.appendChild(tdSize);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);

    // Load icon asynchronously
    if (app.iconString) {
       ipcRenderer.invoke('get-file-icon', app.iconString).then(dataUrl => {
           if(dataUrl) {
              let imgEl = document.getElementById(iconId);
              if(imgEl) {
                 imgEl.src = dataUrl;
                 imgEl.style.display = 'block';
              }
           }
       });
    }
  }
}

// Event delegation on the table body — handles ALL button clicks robustly
document.getElementById('app-table-body').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const idx = parseInt(btn.dataset.index, 10);
  const app = currentFilteredList[idx];
  if (!app) return;

  if (btn.dataset.action === 'folder' && app.location) {
    ipcRenderer.invoke('open-folder', app.location);
  }

  if (btn.dataset.action === 'uninstall' && app.uninstallString) {
    if (confirm(`¿Estás seguro de que quieres desinstalar "${app.name}"?`)) {
      ipcRenderer.invoke('uninstall-app', app.uninstallString).then(res => {
        if (!res.success) {
          alert('Error al desinstalar: ' + res.msg);
        } else {
          // Refresh the list after uninstall
          btn.textContent = 'Done';
          btn.disabled = true;
        }
      });
    }
  }
});

// Event Listeners
document.getElementById('search-input').addEventListener('input', (e) => {
   renderApps(e.target.value);
});

document.querySelectorAll('.btn-filter').forEach(btn => {
   btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      renderApps(document.getElementById('search-input').value);
   });
});

// Init on load
window.onload = () => {
   loadDrives();
   loadApps();
}
