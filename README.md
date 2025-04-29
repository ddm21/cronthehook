# Cronthehook

A Node.js service for scheduling, managing, and executing webhook jobs using Supabase as a backend. Includes a secure API and a worker script for processing jobs, designed for use with Supabase Cron or any external scheduler.

---

## Features
- Schedule webhook jobs for future execution
- Secure API with API key authentication
- Retry and failure handling
- Query, retry, and delete jobs
- Worker script for processing jobs on a schedule

---

## Environment Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   WORKER_POLL_INTERVAL_SECONDS=60
   MAX_RETRY_ATTEMPTS=3
   PRIVATE_API_KEY=your_private_api_key
   ```
4. **Set up the jobs table in Supabase:**
   The service will create jobs in a table with this schema:
   ```sql
   create table public.jobs (
     id uuid primary key default gen_random_uuid(),
     webhook_url text not null,
     payload jsonb not null,
     scheduled_time timestamp with time zone not null,
     status text not null check (status in ('pending', 'completed', 'failed')),
     retries integer not null default 0,
     last_error text,
     created_at timestamp with time zone not null default now(),
     completed_at timestamp with time zone
   );
   ```

---

## Running the Service

### Local Testing / Development

- **Start the API server:**
  ```sh
  npm run dev
  # or
  npm start
  ```
- **Run the worker manually:**
  ```sh
  npm run worker
  ```
  This will process due jobs once. For repeated processing, see below.

### Production Deployment

#### ✅ **With PM2 (recommended for Node.js apps):**

- **Install PM2 globally (if not already):**
  ```sh
  npm install -g pm2
  ```
- **Start the API server:**
  ```sh
  pm2 start index.js --name cronthehook-api
  ```
- **Run the worker on a schedule (every minute):**
  ```sh
  pm2 start worker/index.js --name cronthehook-worker --cron "* * * * *"
  ```
- **View logs and monitor:**
  ```sh
  pm2 logs
  pm2 monit
  ```

#### ✅ **Expose the Service via Domain (with Caddy)**

To expose your service on a custom domain with automatic HTTPS, use [Caddy](https://caddyserver.com/):

- **Install Caddy (Linux)**:
  ```bash
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update
  sudo apt install caddy
  ```

- **Create a `Caddyfile` in your project root**:
  ```
  yourdomain.com {
      reverse_proxy localhost:3000
  }
  ```

  - Replace `yourdomain.com` with your actual domain name.
  - Replace `3000` with the port your Node.js app uses.

- **Start Caddy using the config**:
  ```bash
  sudo caddy run --config ./Caddyfile --adapter caddyfile
  ```

- **(Optional) Run Caddy as a background service**:
  ```bash
  sudo cp ./Caddyfile /etc/caddy/Caddyfile
  sudo systemctl restart caddy
  sudo systemctl enable caddy
  ```

#### ✅ **With Docker**

- **Build the Docker image:**
  ```sh
  docker build -t cronthehook .
  ```
- **Run the container (with your .env file):**
  ```sh
  docker run -p 3000:3000 --env-file .env cronthehook
  ```
  - The API will be available on port 3000 by default.
  - The worker will run on a schedule as defined in `ecosystem.config.js` (every minute).

---

## API Authentication
All endpoints require the `X-API-KEY` header set to your `PRIVATE_API_KEY` from `.env`.

---

## API Endpoints

### 1. Schedule a Job
**POST** `/api/schedule`

**Body:**
```js
{
  "webhook_url": "https://example.com/hook",
  "payload": { "foo": "bar" },
  "scheduled_time": "28-04-2025 22:30", // dd-mm-yyyy HH:mm (24hr)
  "timezone": "Asia/Kolkata" // (optional, defaults to UTC if not provided)
}
```
**Headers:**
- `X-API-KEY: <your PRIVATE_API_KEY>`

**Response:**
```js
{ "id": "<job-uuid>" }
```

---

### 2. List Jobs
**GET** `/api/jobs`

**Query Parameters:**
- `status` (optional): Filter by job status (`pending`, `completed`, `failed`)

**Headers:**
- `X-API-KEY: <your PRIVATE_API_KEY>`

**Response:**
```js
{ "jobs": [ ... ] }
```

---

### 3. Retry a Job
**POST** `/api/jobs/:id/retry`

**Headers:**
- `X-API-KEY: <your PRIVATE_API_KEY>`

**Response:**
```js
{ "job": { ...updated job... } }
```

---

### 4. Delete a Job
**DELETE** `/api/jobs/:id/delete`

**Headers:**
- `X-API-KEY: <your PRIVATE_API_KEY>`

**Response:**
```js
{ "message": "Job deleted", "job": { ...deleted job... } }
```

---

## Worker Script
The worker script (`worker/index.js`) should be triggered every `$WORKER_POLL_INTERVAL_SECONDS` (e.g., via PM2 cron, system cron, or Supabase Cron). It will:
- Fetch all `pending` jobs where `scheduled_time <= now()`
- POST the payload to the job's `webhook_url`
- Mark jobs as `completed` on success
- Increment `retries` and set `status` to `failed` if retries exceed `MAX_RETRY_ATTEMPTS`
- Log errors in the `last_error` field

---

## Example: Schedule a Job (curl)
```sh
curl -X POST http://localhost:3000/api/schedule \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_private_api_key" \
  -d '{
    "webhook_url": "https://example.com/hook",
    "payload": { "foo": "bar" },
    "scheduled_time": "28-04-2025 22:30",
    "timezone": "Asia/Kolkata"
  }'
```

---

## License
MIT 
