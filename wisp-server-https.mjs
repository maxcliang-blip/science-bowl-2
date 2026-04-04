import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createServer } from 'https';
import { readFileSync } from 'fs';

const PORT = process.env.PORT || 443;
const HOST = process.env.HOST || '0.0.0.0';

const options = {
  key: readFileSync('key.pem'),
  cert: readFileSync('cert.pem'),
};

const server = createServer(options);

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/wisp' || req.url?.startsWith('/wisp')) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Wisp server running on wss://${HOST}:${PORT}/wisp`);
});
