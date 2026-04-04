import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createServer } from 'http';

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';

const server = createServer();

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/wisp' || req.url?.startsWith('/wisp')) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Wisp server running on ${HOST}:${PORT}`);
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/wisp`);
});
