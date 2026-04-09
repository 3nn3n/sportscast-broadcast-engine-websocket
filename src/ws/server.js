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
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });

  wss.on('connection', async (socket, req) => {
    if(wsArcjetConfig) {
      try{
        const decision = await wsArcjetConfig.protect(req);
        if(decision.isDenied()){
          const code = decision.reason.isRateLimit() ? 1013 : 1008; // 1013 for rate limit, 1008 for other denials
          const reason = decision.reason.isRateLimit() ? "WebSocket connection closed due to rate limiting" : "WebSocket connection closed due to Arcjet security rules";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("Arcjet WebSocket error:", error);
        socket.close(1011, "WebSocket connection closed due to Arcjet error");
        return;
      }
    }


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