import WebSocket, { WebSocketServer } from 'ws';
import { wsArcjetConfig } from '../config/arcjet.js';


function sendJSON(socket, data) {
  if(socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(data));
}

function broadcast(wss, data) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(data));
  }
}

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

  server.on('upgrade', async (req, socket, head) => {
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }

    if (wsArcjetConfig) {
      try {
        const decision = await wsArcjetConfig.protect(req);
        if (decision.isDenied()) {
          const statusCode = decision.reason.isRateLimit() ? 429 : 403;
          const message = decision.reason.isRateLimit()
            ? 'Too Many Requests'
            : 'Forbidden';
          socket.write(`HTTP/1.1 ${statusCode} ${message}\r\n\r\n`);
          socket.destroy();
          return;
        }
      } catch (error) {
        console.error('Arcjet WebSocket error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (socket, req) => {
    socket.isAlive = true;
    socket.on('pong', () => socket.isAlive = true);
    sendJSON(socket, {type: 'welcome', message: 'Welcome to SportsCast WebSocket!'});

    socket.on('error', console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach(socket => {
      if (!socket.isAlive) {
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, {type: 'matchCreated', match});
  }

  return { broadcastMatchCreated };
}