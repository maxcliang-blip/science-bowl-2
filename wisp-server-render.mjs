import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createServer } from 'https';
import { readFileSync } from 'fs';

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const server = createServer({
  key: readFileSync('/etc/ssl/private/server.key'),
  cert: readFileSync('/etc/ssl/certs/server.crt'),
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/wisp' || req.url?.startsWith('/wisp')) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Wisp server running on wss://0.0.0.0:${PORT}/wisp`);
  console.log(`Point your browser to: wss://your-render-url.onrender.com/wisp`);
});
