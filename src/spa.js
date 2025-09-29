// SPA mínima vanilla para no bloquear avance (luego se migra a React/Vite)

const API = 'http://localhost:3001';
// Activar logs: localStorage.setItem('SR_DEBUG','1'); Desactivar: localStorage.removeItem('SR_DEBUG')
const DEBUG = localStorage.getItem('SR_DEBUG') === '1';
const d = (...a) => { if (DEBUG) console.log('[SR_DEBUG]', ...a); };

let state = {
  token: null,
  user: null,
  houses: [],
  myHouse: null, // se llenará tras loadMyHouse
  myHouseLoaded: false, // para evitar mostrar formulario antes de saber si existe
  authMode: 'login', // 'login' | 'register'
  authMessage: null, // mensajes de feedback (post registro, etc.)
};

function saveToken(t) {
  state.token = t;
  if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Error');
  return res.json();
}

async function loadHouses() {
  d('loadHouses:request');
  state.houses = await api('/houses');
  d('loadHouses:response', state.houses.length);
}

async function loadMyHouse() {
  d('loadMyHouse:request');
  try { state.myHouse = await api('/houses/me'); d('loadMyHouse:response', !!state.myHouse); } catch (e) { d('loadMyHouse:error', e.message); state.myHouse = null; }
}

function render() {
  const root = document.getElementById('root');
  if (!root) return;
  d('render', { token: !!state.token, myHouseLoaded: state.myHouseLoaded, hasHouse: !!state.myHouse });
  if (!state.token) {
    root.innerHTML = authView();
    attachAuthHandlers();
    return;
  }
  root.innerHTML = dashboardView();
  attachDashboardHandlers();
  renderMap();
}

function authView() {
  const mode = state.authMode;
  const msg = state.authMessage ? `<p style="margin:.5rem 0;font-size:.75rem;color:#4caf50;">${state.authMessage}</p>` : '';
  if (mode === 'register') {
    return `
    <div class="container">
      <h1>Spooky Route</h1>
      <div class="card">
        <h2>Crear cuenta</h2>
        ${msg}
        <form id="registerForm">
          <input name="username" placeholder="Usuario" required />
          <input name="password" type="password" placeholder="Contraseña" required />
          <button>Registrarme</button>
        </form>
        <p style="font-size:.75rem;margin-top:.75rem;">¿Ya tienes cuenta? <a href="#" id="goLogin">Inicia sesión</a></p>
      </div>
    </div>`;
  }
  // login por defecto
  return `
  <div class="container">
    <h1>Spooky Route</h1>
    <div class="card">
      <h2>Iniciar sesión</h2>
      ${msg}
      <form id="loginForm">
        <input name="username" placeholder="Usuario" required />
        <input name="password" type="password" placeholder="Contraseña" required />
        <button>Entrar</button>
      </form>
      <p style="font-size:.75rem;margin-top:.75rem;">¿No tienes cuenta? <a href="#" id="goRegister">Regístrate</a></p>
    </div>
  </div>`;
}

function dashboardView() {
  const house = state.myHouse;
  return `
  <div class="container">
    <header class="topbar">
      <h1>Spooky Route</h1>
      <button id="logoutBtn">Salir</button>
    </header>
    <section class="card">
      <h2>Mi Casa</h2>
      ${!house && state.myHouseLoaded ? `
        <form id="houseForm">
          <label style="display:block;font-size:.8rem;opacity:.7;">Dirección (escribe y selecciona sugerencia)</label>
          <input id="addressSearch" autocomplete="off" placeholder="Calle, número, colonia..." required />
          <div id="suggestions" class="suggestions"></div>
          <input type="hidden" name="fullText" value="" />
          <input type="hidden" name="lat" value="" />
          <input type="hidden" name="lng" value="" />
          <div style="display:flex;gap:.5rem;">
            <div style="flex:2;">
              <input id="manualStreet" placeholder="Calle" style="width:100%;" />
            </div>
            <div style="flex:1;">
              <input id="manualNumber" placeholder="Número" style="width:100%;" />
            </div>
          </div>
          <div id="manualHint" style="font-size:.65rem;opacity:.65;line-height:1.2;margin:.25rem 0 .4rem;display:none;">Sin resultados. Puedes escribir la calle y número manualmente y usar tu posición para guardar.</div>
          <button type="button" id="useCurrentLocationBtn" style="width:auto;padding:.45rem .75rem;font-size:.7rem;">Usar mi ubicación actual</button>
          <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem;"><input type="checkbox" name="givingCandy" /> Entrego dulces</label>
          <button style="margin-top:.5rem;">Registrar</button>
          <p id="selectedAddress" style="font-size:.75rem;opacity:.8;margin-top:.4rem;">Sin dirección seleccionada</p>
          <p id="houseError" style="color:#f66;font-size:.7rem;margin:.25rem 0 0 0;"></p>
        </form>
      ` : house ? `
        <div id="houseView">
          <p style="margin:.25rem 0;font-size:.85rem;opacity:.85;">Dirección:</p>
          <p style="margin:.25rem 0 .75rem 0;font-weight:600;">${house.addressText}</p>
          <p style="margin:.25rem 0;font-size:.85rem;">Entrego dulces: <strong>${house.givingCandy ? 'Sí' : 'No'}</strong></p>
          <button id="editHouseBtn" style="margin-top:.75rem;">Editar</button>
        </div>
        <form id="houseEditForm" style="display:none;margin-top:1rem;">
          <label style="display:block;font-size:.8rem;opacity:.7;">Editar dirección (elige nueva sugerencia)</label>
          <input id="addressSearchEdit" autocomplete="off" placeholder="Calle, número, colonia..." value="${house.addressText.replace(/"/g,'&quot;')}" />
          <div id="suggestions" class="suggestions"></div>
          <input type="hidden" name="fullText" value="${house.addressText}" />
          <input type="hidden" name="lat" value="${house.lat}" />
          <input type="hidden" name="lng" value="${house.lng}" />
          <div style="display:flex;gap:.5rem;">
            <div style="flex:2;">
              <input id="manualStreet" placeholder="Calle" style="width:100%;" value="${house.street || ''}" />
            </div>
            <div style="flex:1;">
              <input id="manualNumber" placeholder="Número" style="width:100%;" value="${house.houseNumber || ''}" />
            </div>
          </div>
          <div id="manualHint" style="font-size:.65rem;opacity:.65;line-height:1.2;margin:.25rem 0 .4rem;display:none;">Sin resultados. Edita manualmente la calle/número o usa tu ubicación.</div>
          <button type="button" id="useCurrentLocationBtn" style="width:auto;padding:.45rem .75rem;font-size:.7rem;">Usar mi ubicación actual</button>
          <label style="margin-top:.5rem;display:flex;align-items:center;gap:.4rem;"><input type="checkbox" name="givingCandy" ${house.givingCandy ? 'checked' : ''}/> Entrego dulces</label>
          <div style="display:flex;gap:.5rem;margin-top:.5rem;">
            <button>Guardar cambios</button>
            <button type="button" id="cancelEditBtn" style="background:#444;">Cancelar</button>
          </div>
          <p id="selectedAddress" style="font-size:.7rem;opacity:.8;margin-top:.4rem;">Actual: ${house.addressText}</p>
          <p id="houseError" style="color:#f66;font-size:.7rem;margin:.25rem 0 0 0;"></p>
        </form>
      ` : `
        <div style="font-size:.8rem;opacity:.7;">Cargando información de tu casa...</div>
      `}
    </section>
    <section class="card">
      <h2>Mapa</h2>
      <div id="map" style="height:400px;border-radius:8px;overflow:hidden;">Cargando mapa...</div>
      <p style="font-size:12px;opacity:.6;">🏠 = Mi casa, 🎃 = Reparten dulces</p>
    </section>
  </div>`;
}

function attachAuthHandlers() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const { token } = await api('/auth/login', { method: 'POST', body: JSON.stringify({
          username: fd.get('username'), password: fd.get('password')
        })});
        saveToken(token);
        state.authMessage = null;
        render();
        loadDashboardData();
      } catch (err) { alert(err.message); }
    });
    const goRegister = document.getElementById('goRegister');
    if (goRegister) goRegister.addEventListener('click', e => { e.preventDefault(); state.authMode = 'register'; state.authMessage = null; render(); });
  }
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({
          username: fd.get('username'), password: fd.get('password')
        })});
        // Mensaje de éxito y volver a login
        state.authMode = 'login';
        state.authMessage = 'Cuenta creada. Ahora inicia sesión.';
        render();
      } catch (err) { alert(err.message); }
    });
    const goLogin = document.getElementById('goLogin');
    if (goLogin) goLogin.addEventListener('click', e => { e.preventDefault(); state.authMode = 'login'; state.authMessage = null; render(); });
  }
}

function attachDashboardHandlers() {
  document.getElementById('logoutBtn').onclick = () => { saveToken(null); render(); };
  const form = document.getElementById('houseForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      d('houseForm:submit');
      const fd = new FormData(e.target);
      const lat = parseFloat(fd.get('lat'));
      const lng = parseFloat(fd.get('lng'));
      const fullText = fd.get('fullText');
      // Permitir modo manual si no hay fullText pero sí calle/número y coords válidas
      const manualStreet = document.getElementById('manualStreet').value.trim();
      const manualNumber = document.getElementById('manualNumber').value.trim();
      const usingManual = !fullText && manualStreet && !isNaN(lat) && !isNaN(lng);
      if ((!fullText || isNaN(lat) || isNaN(lng)) && !usingManual) {
        alert('Selecciona una sugerencia o usa tu ubicación y completa calle/número');
        return;
      }
      try {
        const address = { fullText: fullText || manualStreet + (manualNumber ? ' ' + manualNumber : ''), lat, lng };
        if (manualStreet) address.street = manualStreet;
        if (manualNumber) address.houseNumber = manualNumber;
        const body = { givingCandy: fd.get('givingCandy') === 'on', address };
        d('houseForm:posting', body);
        await api('/houses/me', { method: 'POST', body: JSON.stringify(body) });
        await Promise.all([loadMyHouse(), loadHouses()]);
        render();
      } catch (err) { alert(err.message); }
    });
    setupAutocomplete();
    setupManualLocationHelpers(form);
  }
  const editForm = document.getElementById('houseEditForm');
  if (editForm) {
    document.getElementById('editHouseBtn').onclick = () => {
      editForm.style.display = 'block';
      document.getElementById('houseView').style.display = 'none';
      setupAutocomplete();
      // Prefill manual fields if vacíos
      const house = state.myHouse;
      const ms = document.getElementById('manualStreet');
      const mn = document.getElementById('manualNumber');
      if (house) {
        if (ms && !ms.value) ms.value = house.street || '';
        if (mn && !mn.value) mn.value = house.houseNumber || '';
      }
    };
    document.getElementById('cancelEditBtn').onclick = () => {
      editForm.style.display = 'none';
      document.getElementById('houseView').style.display = 'block';
    };
    editForm.addEventListener('submit', async e => {
      e.preventDefault();
      d('houseEditForm:submit');
      const fd = new FormData(editForm);
      const lat = parseFloat(fd.get('lat'));
      const lng = parseFloat(fd.get('lng'));
      const fullText = fd.get('fullText');
      const manualStreet = document.getElementById('manualStreet').value.trim();
      const manualNumber = document.getElementById('manualNumber').value.trim();
      const usingManual = !fullText && manualStreet && !isNaN(lat) && !isNaN(lng);
      if ((!fullText || isNaN(lat) || isNaN(lng)) && !usingManual) {
        alert('Selecciona una sugerencia o usa tu ubicación y completa calle/número');
        return;
      }
      try {
        const address = { fullText: fullText || manualStreet + (manualNumber ? ' ' + manualNumber : ''), lat, lng };
        if (manualStreet) address.street = manualStreet;
        if (manualNumber) address.houseNumber = manualNumber;
        const body = { givingCandy: fd.get('givingCandy') === 'on', address };
        d('houseEditForm:posting', body);
        await api('/houses/me', { method: 'POST', body: JSON.stringify(body) });
        await Promise.all([loadMyHouse(), loadHouses()]);
        render();
      } catch (err) {
        const el = document.getElementById('houseError');
        if (el) el.textContent = err.message || 'Error guardando'; else alert(err.message);
      }
    });
  }
}

let leafletMap = null;
let leafletMarkers = [];
// Control de carga dinámica de Leaflet
const leafletLoader = {
  attempt: 0,
  maxAttempts: 3,
  injecting: false,
  lastError: null
};

function injectLeaflet(urlJs, urlCss) {
  if (leafletLoader.injecting) return;
  leafletLoader.injecting = true;
  if (urlCss && !document.querySelector('link[data-leaflet-dynamic]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = urlCss;
    l.setAttribute('data-leaflet-dynamic', '1');
    document.head.appendChild(l);
  }
  if (!document.querySelector('script[data-leaflet-dynamic]')) {
    const s = document.createElement('script');
    s.src = urlJs;
    s.defer = true;
    s.setAttribute('data-leaflet-dynamic', '1');
    s.onload = () => { leafletLoader.injecting = false; setTimeout(renderMap, 50); };
    s.onerror = (e) => { leafletLoader.injecting = false; leafletLoader.lastError = e; };
    document.head.appendChild(s);
  } else {
    leafletLoader.injecting = false;
  }
}

function ensureLeaflet(container) {
  if (typeof L !== 'undefined') { d('ensureLeaflet:present'); return true; }
  if (leafletLoader.attempt >= leafletLoader.maxAttempts) {
    container.innerHTML = `<div style="padding:1rem;font-size:.8rem;line-height:1.3;">
      No se pudo cargar el mapa después de varios intentos.<br>
      Verifica tu conexión o que no haya un bloqueador.<br>
      <button id="retryLeafletBtn" style="margin-top:.5rem;padding:.4rem .7rem;">Reintentar</button>
    </div>`;
    const btn = container.querySelector('#retryLeafletBtn');
    if (btn) btn.onclick = () => {
      leafletLoader.attempt = 0; leafletLoader.lastError = null; leafletMap = null; renderMap();
    };
    return false;
  }
  // Intento de carga progresiva con fallback a jsDelivr
  leafletLoader.attempt++;
  const useFallback = leafletLoader.attempt > 1; // primer intento unpkg, luego jsdelivr
  const base = useFallback ? 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist' : 'https://unpkg.com/leaflet@1.9.4/dist';
  d('ensureLeaflet:inject', { attempt: leafletLoader.attempt, base });
  injectLeaflet(base + '/leaflet.js', base + '/leaflet.css');
  container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:.5rem;">\n    <div class="map-spinner" aria-label="Cargando mapa"></div>\n    <div style="font-size:.75rem;opacity:.7;">Cargando mapa (intento ${leafletLoader.attempt}${useFallback ? ' fallback' : ''})...</div>\n  </div>`;
  // reintentar en 1s si todavía no
  setTimeout(() => { if (typeof L === 'undefined') renderMap(); }, 1100);
  return false;
}

function renderMap() {
  const container = document.getElementById('map');
  if (!container) return;
  d('renderMap:start', { mapCreated: !!leafletMap });
  if (!ensureLeaflet(container)) return;
  if (!state.houses.length && !state.myHouse) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:.85rem;opacity:.7;">Cargando datos de mapa...</div>';
  }
  const initialCenter = state.myHouse ? [state.myHouse.lat, state.myHouse.lng] : (state.houses[0] ? [state.houses[0].lat, state.houses[0].lng] : [19.4326, -99.1332]);
  // Si el DOM fue re-renderizado (login inmediato) y el contenedor anterior desapareció, recrear el mapa
  if (leafletMap) {
    try {
      const currentContainer = leafletMap.getContainer();
      if (currentContainer !== container) {
        d('renderMap:containerChanged -> recreate');
        leafletMap.remove();
        leafletMap = null;
      }
    } catch (e) {
      d('renderMap:getContainer error', e.message);
      leafletMap = null;
    }
  }
  if (!leafletMap) {
    // Limpiar cualquier placeholder antes de crear el mapa para que no quede el texto encima
    container.innerHTML = '';
    d('renderMap:create', initialCenter);
    leafletMap = L.map(container).setView(initialCenter, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(leafletMap);
    // Asegurar que el tamaño se calcule correctamente tras layouts recién pintados
    setTimeout(() => { try { leafletMap.invalidateSize(); d('renderMap:invalidateSize'); } catch {} }, 120);
  }
  if (!state.houses.length && !state.myHouse) return;
  leafletMarkers.forEach(m => m.remove());
  leafletMarkers = [];
  const boundsPts = [];

  // Preparamos iconos emoji
  const pumpkinIcon = L.divIcon({
    html: '<span class="emoji-ic">🎃</span>',
    className: 'emoji-marker',
    iconSize: [32,32],
    iconAnchor: [16,30],
    popupAnchor: [0,-28]
  });
  const houseIcon = L.divIcon({
    html: '<span class="emoji-ic">🏠</span>',
    className: 'emoji-marker',
    iconSize: [32,32],
    iconAnchor: [16,30],
    popupAnchor: [0,-28]
  });
  state.houses.forEach(h => {
    const parts = [];
    if (h.street) parts.push(h.street + (h.houseNumber ? ' ' + h.houseNumber : ''));
    if (h.suburb) parts.push(h.suburb);
    if (h.city || h.municipality) parts.push(h.city || h.municipality);
    if (h.state) parts.push(h.state);
    const label = parts.length ? parts.join(', ') : h.addressText;
    const marker = L.marker([h.lat, h.lng], { title: label, icon: pumpkinIcon });
    marker.bindPopup(`<strong>${h.username}</strong><br>${label}`);
    marker.addTo(leafletMap);
    leafletMarkers.push(marker);
    boundsPts.push([h.lat, h.lng]);
  });
  if (state.myHouse) {
    const my = state.myHouse;
    const myMarker = L.marker([my.lat, my.lng], { title: 'Mi Casa', icon: houseIcon });
    myMarker.bindPopup(`<strong>Mi Casa</strong><br>${my.addressText}`);
    myMarker.addTo(leafletMap);
    leafletMarkers.push(myMarker);
    boundsPts.push([my.lat, my.lng]);
  }
  if (boundsPts.length) {
    const b = L.latLngBounds(boundsPts);
    leafletMap.fitBounds(b.pad(0.18));
    d('renderMap:fitBounds', boundsPts.length);
  }
  d('renderMap:markers', leafletMarkers.length);
}

async function loadDashboardData() {
  try {
    d('loadDashboardData:start');
    await loadHouses();
    renderMap();
    await loadMyHouse();
    state.myHouseLoaded = true;
    d('loadDashboardData:loaded', { my: !!state.myHouse, houses: state.houses.length });
  } catch (e) {
    console.warn('Error cargando datos dashboard', e);
    state.myHouseLoaded = true;
    d('loadDashboardData:error', e.message);
  }
  render(); // re-render para actualizar vista (form vs detalles) una vez conocemos myHouse
  renderMap();
  d('loadDashboardData:end');
}

export function init() {
  const stored = localStorage.getItem('token');
  if (stored) state.token = stored;
  d('init', { token: !!state.token });
  render();
  if (state.token) {
    // Carga asíncrona de datos para que el dashboard aparezca rápido
    loadDashboardData();
  }
  if (DEBUG) {
    window._srDump = () => ({ state: JSON.parse(JSON.stringify(state)), leafletMapPresent: !!leafletMap, markers: leafletMarkers.length });
    d('debug helpers ready: call window._srDump() in console');
    // Watchdog: si después de 5s no existe leafletMap, log y botón de retry
    setTimeout(() => {
      if (!leafletMap) {
        const mapEl = document.getElementById('map');
        if (mapEl) {
          mapEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:.5rem;align-items:center;justify-content:center;height:100%;">'+
            '<div style="font-size:.8rem;opacity:.75;">El mapa no se inicializó todavía.</div>'+ 
            '<button id="forceRetryMap" style="padding:.4rem .8rem;">Reintentar mapa</button>'+ 
            (leafletLoader.lastError ? '<div style="color:#f66;font-size:.65rem;max-width:240px;text-align:center;">Error: '+ (leafletLoader.lastError.message||'') +'</div>' : '') +
            '</div>';
          const btn = document.getElementById('forceRetryMap');
          if (btn) btn.onclick = () => { leafletLoader.attempt = 0; leafletLoader.lastError = null; renderMap(); };
          d('watchdog:map not initialized after 5s');
        }
      }
    }, 5000);
  }
}

// --- Autocomplete / Geocoding ---
let geoAbortController = null;
function setupAutocomplete() {
  // Buscar input de registro o de edición
  const input = document.getElementById('addressSearch') || document.getElementById('addressSearchEdit');
  const sugBox = document.getElementById('suggestions');
  if (!input || !sugBox) return;

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    d('autocomplete:input', q);
    sugBox.innerHTML = '';
    if (q.length < 3) return;
    if (geoAbortController) geoAbortController.abort();
    geoAbortController = new AbortController();
    try {
      const res = await fetch(API + '/geocode/search?q=' + encodeURIComponent(q), { signal: geoAbortController.signal });
      if (!res.ok) { d('autocomplete:errorStatus', res.status); return; }
      const data = await res.json();
      d('autocomplete:results', data.length);
      processGeocodeSuggestions(data, sugBox, input);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Error geocode', e);
    }
  });

  document.addEventListener('click', (ev) => {
    if (ev.target !== input) sugBox.innerHTML = '';
  });
}

function setupManualLocationHelpers(form) {
  const btn = document.getElementById('useCurrentLocationBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
      return;
    }
    btn.disabled = true; btn.textContent = 'Obteniendo ubicación...';
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const latInput = form.querySelector('input[name=lat]');
      const lngInput = form.querySelector('input[name=lng]');
      if (latInput && lngInput) { latInput.value = latitude; lngInput.value = longitude; }
      // Ocultar campo de búsqueda al usar ubicación actual
      const searchInput = form.querySelector('#addressSearch') || form.querySelector('#addressSearchEdit');
      const suggestionsBox = document.getElementById('suggestions');
      if (searchInput) { searchInput.style.display = 'none'; }
      if (suggestionsBox) { suggestionsBox.innerHTML = ''; suggestionsBox.style.display = 'none'; }
      const sel = document.getElementById('selectedAddress');
      if (sel) sel.textContent = 'Usando ubicación actual. Completa calle y número y guarda.';
      btn.textContent = 'Ubicación lista';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Usar mi ubicación actual'; }, 2500);
    }, err => {
      alert('Error ubicando: ' + err.message);
      btn.disabled = false; btn.textContent = 'Usar mi ubicación actual';
    }, { enableHighAccuracy: true, timeout: 8000 });
  });
}

// Factorizar procesado sugerencias
function processGeocodeSuggestions(data, sugBox, inputEl) {
  if (!Array.isArray(data) || !data.length) {
    sugBox.innerHTML = '<div class="suggestion" style="opacity:.6;">Sin resultados</div>';
    return;
  }
  data.slice(0, 10).forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion';
    const display = item.displayName || item.display_name;
    div.textContent = display;
    div.addEventListener('click', () => {
      const form = document.getElementById('houseForm') || document.getElementById('houseEditForm');
      if (!form) return;
      form.querySelector('input[name=fullText]').value = display;
      form.querySelector('input[name=lat]').value = item.lat || item.lat;
      form.querySelector('input[name=lng]').value = item.lng || item.lon;
      const addr = item.address || {};
      const street = addr.road || addr.street || addr.pedestrian || '';
      const number = addr.house_number || '';
      if (street) document.getElementById('manualStreet').value = street;
      if (number) document.getElementById('manualNumber').value = number;
      const selected = document.getElementById('selectedAddress');
      if (selected) selected.textContent = 'Seleccionada: ' + display;
      sugBox.innerHTML = '';
    });
    sugBox.appendChild(div);
  });
}
