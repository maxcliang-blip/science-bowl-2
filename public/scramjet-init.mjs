const PUBLIC_WISP_SERVERS = [
  'wss://wisp.mercurywork.shop',
];

const CUSTOM_WISP_URL = typeof localStorage !== 'undefined' ? localStorage.getItem('browserCustomWispUrl') || '' : '';

let state = {
  controller: null,
  isInitialized: false,
  error: null,
};

async function fetchScript(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return await response.text();
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
    console.log('[Scramjet] Fetching scripts...');
    
    // Fetch and execute scripts in order
    const scripts = [
      '/scram/scramjet.codecs.js',
      '/scramjet.config.js',
      '/scram/scramjet.bundle.js',
      '/baremux/worker.mjs',
      '/scram/scramjet.worker.js',
      '/scram/scramjet.client.js',
    ];
    
    for (const src of scripts) {
      console.log('[Scramjet] Loading:', src);
      const code = await fetchScript(src);
      eval(code);
    }
    
    console.log('[Scramjet] Scripts loaded');
    console.log('[Scramjet] Codecs:', typeof self.__scramjet$codecs);
    console.log('[Scramjet] Config:', typeof self.__scramjet$config);
    
    if (typeof self.__scramjet$codecs === 'undefined') {
      throw new Error('Codecs not loaded');
    }
    
    console.log('[Scramjet] Registering SW...');
    
    const reg = await navigator.serviceWorker.register('/sw-scramjet.js', { scope: '/' });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('[Scramjet] Connecting BareMux...');
    
    if (window.BareMux?.BareMuxConnection) {
      const connection = new window.BareMux.BareMuxConnection('/baremux/worker.mjs');
      
      try {
        await connection.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl }]);
        console.log('[Scramjet] Connected!');
      } catch (e) {
        console.error('[Scramjet] Transport error:', e);
        state.error = 'Transport failed';
      }
    } else {
      state.error = 'BareMux not found';
    }

    state.isInitialized = true;
    window.__scramjetReady = true;
    return state;
  } catch (error) {
    state.error = error.message;
    console.error('[Scramjet] Failed:', error);
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
