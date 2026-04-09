import WebSocket, { WebSocketServer } from 'ws';


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

  wss.on('connection', (socket) => {
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