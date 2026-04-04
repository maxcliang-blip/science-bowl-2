interface ScramjetInstance {
  controller: any | null;
  isInitialized: boolean;
  isSupported: boolean;
  error: string | null;
}

const PUBLIC_WISP_SERVERS = [
  'wss://wisp.mercurywork.shop',
];

let instance: ScramjetInstance = {
  controller: null,
  isInitialized: false,
  isSupported: false,
  error: null,
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
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

export async function initScramjet(): Promise<ScramjetInstance> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    instance.error = 'Scramjet can only be initialized in browser';
    return instance;
  }

  if (!('serviceWorker' in navigator)) {
    instance.error = 'Service Workers not supported';
    return instance;
  }

  try {
    await loadScript('/baremux/worker.mjs');
    await loadScript('/scramjet.config.js');
    await loadScript('/scram/scramjet.bundle.js');
    await loadScript('/scram/scramjet.client.js');

    const sw = navigator.serviceWorker.register('/sw-scramjet.js', {
      scope: '/',
    });

    await sw;

    const { ScramjetController } = (window as any).$scramjetLoadController?.() || {};
    
    if (ScramjetController) {
      instance.controller = new ScramjetController();
      await instance.controller.init();
    }

    if ((window as any).BareMux?.BareMuxConnection) {
      const connection = new (window as any).BareMux.BareMuxConnection('/baremux/worker.mjs');
      
      try {
        await connection.setTransport('/epoxy/index.mjs', [{ 
          wisp: PUBLIC_WISP_SERVERS[0] 
        }]);
      } catch (e) {
        console.warn('[Scramjet] Epoxy transport setup warning:', e);
      }
    }

    instance.isInitialized = true;
    instance.isSupported = true;
    instance.error = null;

    return instance;
  } catch (error) {
    instance.isInitialized = false;
    instance.isSupported = false;
    instance.error = (error as Error).message;
    console.error('[Scramjet] Init failed:', error);
    return instance;
  }
}

export async function navigateWithScramjet(url: string): Promise<void> {
  if (!instance.controller || !instance.isInitialized) {
    throw new Error('Scramjet not initialized');
  }
  if (instance.controller.navigate) {
    instance.controller.navigate(url);
  } else {
    window.location.href = '/scramjet/?url=' + encodeURIComponent(url);
  }
}

export function getScramjetInstance(): ScramjetInstance {
  return instance;
}

export function isScramjetReady(): boolean {
  return instance.isInitialized && instance.controller !== null;
}

export function terminateScramjet(): void {
  if (instance.controller?.close) {
    instance.controller.close();
  }
  instance = {
    controller: null,
    isInitialized: false,
    isSupported: false,
    error: null,
  };
}
