export const SCRAMJET_CONFIG = {
  prefix: '/scramjet/',
  wispServer: 'wss://wisp.mercurywork.shop'
};

export interface ScramjetController {
  createFrame(): ScramjetFrame;
  destroy(): void;
}

export interface ScramjetFrame {
  readonly frame: HTMLIFrameElement;
  go(url: string): Promise<void>;
  back(): void;
  forward(): void;
  reload(): void;
  destroy(): void;
  get url(): string;
  get title(): string;
  get loading(): boolean;
  onload: (() => void) | null;
  onclose: (() => void) | null;
}

declare global {
  interface Window {
    $scramjetLoadController: () => {
      ScramjetController: new (config: Record<string, unknown>) => ScramjetController;
    };
    $scramjetLoadWorker: () => {
      ScramjetServiceWorker: new () => unknown;
    };
    ScramjetController: new (config: Record<string, unknown>) => ScramjetController;
    ScramjetFrame: new () => ScramjetFrame;
  }
}

let controller: ScramjetController | null = null;
let currentFrame: ScramjetFrame | null = null;
let initialized = false;
let initPromise: Promise<boolean> | null = null;

export async function loadScramjetScripts(): Promise<void> {
  return new Promise((resolve, reject) => {
    const scripts = [
      '/baremux/worker.js',
      '/scramjet/scramjet.bundle.js'
    ];
    
    let loaded = 0;
    let error = null;

    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length) {
          resolve();
        }
      };
      script.onerror = (e) => {
        error = e;
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });

    if (error) {
      reject(error);
    }
  });
}

export async function initScramjet(): Promise<boolean> {
  if (initialized) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await loadScramjetScripts();

      const { BareMuxConnection } = await import('@mercuryworkshop/bare-mux');
      const conn = new BareMuxConnection('/baremux/worker.js');
      
      try {
        await conn.setTransport('/baremux/index.mjs', [{ wisp: SCRAMJET_CONFIG.wispServer }]);
      } catch (transportError) {
        console.warn('Transport setup warning:', transportError);
      }

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', reg);
        } catch (swError) {
          console.warn('Service Worker registration failed:', swError);
        }
      }

      const { ScramjetController } = window.$scramjetLoadController();
      
      controller = new ScramjetController({
        prefix: SCRAMJET_CONFIG.prefix
      });

      initialized = true;
      console.log('ScramJet initialized successfully');
      return true;
    } catch (error) {
      console.error('ScramJet initialization failed:', error);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

export function createFrame(): ScramjetFrame | null {
  if (!controller) {
    console.error('ScramJet not initialized');
    return null;
  }

  if (currentFrame) {
    currentFrame.destroy();
  }

  currentFrame = controller.createFrame();
  return currentFrame;
}

export function getFrame(): ScramjetFrame | null {
  return currentFrame;
}

export function navigateTo(url: string): void {
  if (!currentFrame) {
    console.error('No frame created');
    return;
  }
  currentFrame.go(url);
}

export function goBack(): void {
  if (currentFrame) {
    currentFrame.back();
  }
}

export function goForward(): void {
  if (currentFrame) {
    currentFrame.forward();
  }
}

export function reload(): void {
  if (currentFrame) {
    currentFrame.reload();
  }
}

export function destroyFrame(): void {
  if (currentFrame) {
    currentFrame.destroy();
    currentFrame = null;
  }
}

export function isInitialized(): boolean {
  return initialized;
}

export function reset(): void {
  destroyFrame();
  controller = null;
  initialized = false;
  initPromise = null;
}
