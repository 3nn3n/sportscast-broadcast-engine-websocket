import WebSocket, { WebSocketServer } from 'ws';
import { wsArcjetConfig } from '../config/arcjet.js';

const matchSubscriptions = new Map();

function subscribeToMatch(socket, matchId) {
  if (!matchSubscriptions.has(matchId)) {
    matchSubscriptions.set(matchId, new Set());
  }
  matchSubscriptions.get(matchId).add(socket);
}

function unsubscribeFromMatch(socket, matchId) {
  const subscriptions = matchSubscriptions.get(matchId);
  if (!subscriptions) return;
  subscriptions.delete(socket);
  if (subscriptions.size === 0) {
    matchSubscriptions.delete(matchId);
  }
}

function cleanUpSubscriptions(socket) {
  for (const matchId of socket.subscriptions || []) {
    unsubscribeFromMatch(socket, matchId);
  }
  socket.subscriptions = [];
}



function sendJSON(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(data));
}

function broadcastToAll(wss, data) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(data));
  }
}

function broadcastToMatch(matchId, data) {
  const subscribers = matchSubscriptions.get(matchId);
  if (!subscribers || subscribers.size === 0) return;
  const message = JSON.stringify(data);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket, message) {
  let parsed;
  try {
    parsed = JSON.parse(message.toString());
  } catch (error) {
    sendJSON(socket, { type: 'error', message: 'Invalid JSON format' });
    return;
} 
  if (parsed.type === 'subscribe' && Number.isInteger(parsed.matchId)) {
    subscribeToMatch(socket, parsed.matchId);
    socket.subscriptions.add(parsed.matchId);
    sendJSON(socket, { type: 'subscribed', matchId: parsed.matchId });
  } else if (parsed.type === 'unsubscribe' && Number.isInteger(parsed.matchId)) {
    unsubscribeFromMatch(socket, parsed.matchId);
    socket.subscriptions.delete(parsed.matchId);
    sendJSON(socket, { type: 'unsubscribed', matchId: parsed.matchId });
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
    socket.subscriptions = new Set();

    sendJSON(socket, { type: 'welcome', message: 'Welcome to SportsCast WebSocket!' });
    socket.on('message', (message) => handleMessage(socket, message));
    socket.on('error', () => socket.terminate());
    socket.on('close', () => cleanUpSubscriptions(socket));
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
    broadcastToAll(wss, { type: 'matchCreated', match });
  }

  function broadcastCommentary(matchId, commentary) {
    broadcastToMatch(matchId, { type: 'commentaryAdded', data: commentary });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}