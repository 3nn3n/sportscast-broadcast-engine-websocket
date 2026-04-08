import express from 'express';
import { matchRouter } from './route/matches.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to SportsCast API!');
});

app.use('/matches', matchRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

