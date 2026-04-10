# SportsCast

Real-time sports match tracking and live commentary API with WebSocket support.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **WebSockets:** `ws` for real-time commentary streaming
- **Validation:** Zod
- **Security:** Arcjet (rate limiting, bot detection, shield)
- **AI:** Vercel AI SDK with OpenAI

## Prerequisites

- Node.js
- PostgreSQL database
- Arcjet API key

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env` file in the project root:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/sportscast
   ARCJET_API_KEY=your_arcjet_key
   ARCJET_ENV=production
   ARCJET_MODE=LIVE
   PORT=3000
   ```

3. **Run database migrations**

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start the server**

   ```bash
   # Development (with hot reload)
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Matches

| Method | Endpoint    | Description          |
| ------ | ----------- | -------------------- |
| GET    | `/matches`  | List matches         |
| POST   | `/matches`  | Create a new match   |

### Commentary

| Method | Endpoint                       | Description                       |
| ------ | ------------------------------ | --------------------------------- |
| GET    | `/matches/:id/commentary`      | List commentary for a match       |
| POST   | `/matches/:id/commentary`      | Add commentary to a match         |

### WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates:

- **Match created** — broadcast to all connected clients
- **Commentary added** — broadcast to clients subscribed to the match

## Database Schema

### `matches`

| Column       | Type        | Description              |
| ------------ | ----------- | ------------------------ |
| id           | serial (PK) | Match ID                 |
| sport        | text        | Sport type               |
| home_team    | text        | Home team name           |
| away_team    | text        | Away team name           |
| status       | enum        | `scheduled`, `live`, `finished` |
| start_time   | timestamp   | Match start time         |
| end_time     | timestamp   | Match end time           |
| home_score   | integer     | Home team score          |
| away_score   | integer     | Away team score          |
| created_at   | timestamp   | Record creation time     |

### `commentary`

| Column     | Type        | Description              |
| ---------- | ----------- | ------------------------ |
| id         | serial (PK) | Commentary ID            |
| match_id   | integer (FK)| Reference to match       |
| minute     | integer     | Match minute             |
| sequence   | integer     | Sequence number          |
| period     | text        | Match period             |
| event_type | text        | Type of event            |
| actor      | text        | Player/person involved   |
| team       | text        | Team name                |
| message    | text        | Commentary text          |
| metadata   | jsonb       | Additional data          |
| tags       | text[]      | Tags array               |
| created_at | timestamp   | Record creation time     |

## Scripts

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start dev server with nodemon      |
| `npm start`          | Start production server            |
| `npm run db:generate`| Generate Drizzle migrations        |
| `npm run db:migrate` | Run database migrations            |
| `npm run db:studio`  | Open Drizzle Studio                |
