const PUBLIC_WISP_SERVERS = [
  'wss://wisp.mercurywork.shop',
];

const CUSTOM_WISP_URL = typeof localStorage !== 'undefined' ? localStorage.getItem('browserCustomWispUrl') || '' : '';

let state = {
  controller: null,
  isInitialized: false,
  error: null,
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function initScramjet(customWispUrl = '') {
  const wispUrl = customWispUrl || CUSTOM_WISP_URL || PUBLIC_WISP_SERVERS[0];
  
  if (typeof window === 'undefined') {
    state.error = 'Browser only';
    return state;
  }

  if (!('serviceWorker' in navigator)) {
    state.error = 'No Service Worker support';
    return state;
  }

  try {
    console.log('[Scramjet] Loading scripts...');
    
    await loadScript('/baremux/worker.mjs');
    await loadScript('/scramjet.config.js');
    await loadScript('/scram/scramjet.bundle.js');
    await loadScript('/scram/scramjet.client.js');

    console.log('[Scramjet] Registering service worker...');
    await navigator.serviceWorker.register('/sw-scramjet.js', { scope: '/' });
    console.log('[Scramjet] Service worker registered');

    if (window.BareMux?.BareMuxConnection) {
      console.log('[Scramjet] Connecting to BareMux...');
      const connection = new window.BareMux.BareMuxConnection('/baremux/worker.mjs');
      
      try {
        console.log('[Scramjet] Setting transport with Wisp:', wispUrl);
        await connection.setTransport('/epoxy/index.mjs', [{ 
          wisp: wispUrl 
        }]);
        console.log('[Scramjet] Connected to Wisp:', wispUrl);
      } catch (e) {
        console.error('[Scramjet] Transport error:', e);
        state.error = 'Failed to connect to Wisp: ' + e.message;
      }
    } else {
      console.error('[Scramjet] BareMux not found!');
      state.error = 'BareMux not loaded';
    }

    state.isInitialized = true;
    window.__scramjetReady = true;
    return state;
  } catch (error) {
    state.error = error.message;
    console.error('[Scramjet] Init failed:', error);
    return state;
  }
}

export function setCustomWispUrl(url) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('browserCustomWispUrl', url);
  }
}

export function getScramjetState() {
  return state;
}

export function isScramjetReady() {
  return state.isInitialized;
}

if (typeof window !== 'undefined') {
  window.initScramjet = initScramjet;
  window.getScramjetState = getScramjetState;
  window.isScramjetReady = isScramjetReady;
  window.setCustomWispUrl = setCustomWispUrl;
}
