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

function renderApps(searchTerm = '') {
  let filtered = appData;
  if (searchTerm) {
     filtered = appData.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.publisher.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  if (currentSort === 'size') {
     filtered.sort((a,b) => b.size - a.size);
  } else if (currentSort === 'name') {
     filtered.sort((a,b) => a.name.localeCompare(b.name));
  }

  const tbody = document.getElementById('app-table-body');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
     tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No applications found matching criteria.</td></tr>';
     return;
  }

  // Optimize render by just chunking or slicing if too large, but electron handles 500 rows easily.
  for (let i = 0; i < filtered.length; i++) {
    const app = filtered[i];
    const tr = document.createElement('tr');
    
    const iconId = 'icon-' + Math.random().toString(36).substr(2, 9);
    
    tr.innerHTML = `
      <td style="font-weight: 600; display: flex; align-items: center; gap: 12px;">
         <img id="${iconId}" src="" alt="" style="width: 24px; height: 24px; border-radius: 4px; display: none;"> 
         ${app.name}
      </td>
      <td style="color: var(--text-muted);">${app.publisher}</td>
      <td style="color: var(--text-muted);">${app.version}</td>
      <td style="color: var(--accent); font-weight: 600;">${app.size > 0 ? formatBytes(app.size) : 'Unknown'}</td>
      <td style="display: flex; gap: 8px;">
        ${app.location ? `<button class="btn-action" onclick="openLocation('${app.location.replace(/\\/g, '\\\\')}')">Folder</button>` : ``}
        ${app.uninstallString ? `<button class="btn-action btn-danger" onclick="uninstallApp('${app.uninstallString.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Uninstall</button>` : ``}
      </td>
    `;
    tbody.appendChild(tr);

    if (app.iconString) {
       ipcRenderer.invoke('get-file-icon', app.iconString).then(dataUrl => {
           if(dataUrl) {
              let img = document.getElementById(iconId);
              if(img) {
                 img.src = dataUrl;
                 img.style.display = 'block';
              }
           }
       });
    }
  }
}

window.uninstallApp = (uninstallString) => {
   if(confirm('¿Estás seguro de que quieres lanzar el desinstalador de esta aplicación?')) {
      ipcRenderer.invoke('uninstall-app', uninstallString).then(res => {
         if(!res.success) {
             alert('Error: ' + res.msg);
         }
      });
   }
}

window.openLocation = (loc) => {
   ipcRenderer.invoke('open-folder', loc);
}

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
