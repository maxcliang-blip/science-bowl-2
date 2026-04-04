const PUBLIC_WISP_SERVERS = [
  'wss://wisp.mercurywork.shop',
];

const CUSTOM_WISP_URL = localStorage.getItem('browserCustomWispUrl') || '';

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
    await loadScript('/baremux/worker.mjs');
    await loadScript('/scramjet.config.js');
    await loadScript('/scram/scramjet.bundle.js');
    await loadScript('/scram/scramjet.client.js');

    await navigator.serviceWorker.register('/sw-scramjet.js', { scope: '/' });

    if (window.BareMux?.BareMuxConnection) {
      const connection = new window.BareMux.BareMuxConnection('/baremux/worker.mjs');
      try {
        await connection.setTransport('/epoxy/index.mjs', [{ 
          wisp: wispUrl 
        }]);
        console.log('[Scramjet] Connected to Wisp:', wispUrl);
      } catch (e) {
        console.warn('Transport setup warning:', e);
        state.error = 'Failed to connect to Wisp server';
      }
    }

    state.isInitialized = true;
    window.__scramjetReady = true;
    return state;
  } catch (error) {
    state.error = error.message;
    console.error('Scramjet init failed:', error);
    return state;
  }
}

export function setCustomWispUrl(url) {
  localStorage.setItem('browserCustomWispUrl', url);
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
