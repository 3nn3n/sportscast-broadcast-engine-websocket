import express from 'express';
import { matchRouter } from './route/matches.js';
import http from 'http';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);
import  {setupWebSocketServer} from './ws/server.js';


app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to SportsCast API!');
});

app.use('/matches', matchRouter);

const {broadcastMatchCreated} = setupWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const BaseURL = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${BaseURL}`);
  console.log(`WebSocket endpoint available at ${BaseURL.replace('http', 'ws')}/ws`);
});
