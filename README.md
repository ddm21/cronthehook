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
   ```
   git clone https://github.com/ddm21/cronthehook.git
   ```
2. **Install dependencies:**
   ```sh
   cd cronthehook && npm install
   ```
3. **Configure environment variables:**
   
   Copy and rename`.env.example` file to `.env`

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

### ✅ Local Testing / Development

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

### ✅ With Docker (Rrecommended for production )

- **Project Structure Example:**

```
/cronthehook
├── .env
├── docker-compose-setup/
│   ├── docker-compose.yml
│   └── Caddyfile
```

- **Run via Compose:**

```bash
cd docker-compose-setup
docker-compose up
```

This will:

- Start the `cronthehook` backend with environment variables from your `.env`
- Launch a Caddy reverse proxy server
- Automatically provision an **HTTPS certificate** using Let's Encrypt for your domain
- Route incoming traffic from `https://yourdomain.com` to the backend at `backend:3000`

> Make sure your domain points to your server’s IP (via an `A` or `CNAME` record).  
> Set your email in the `Caddyfile` to receive cert renewal alerts.

  - The API will be available on port 3000 by default in testing or `https://yourdomain.com` in production.
  - The worker will run on a schedule as defined in `.env in WORKER_POLL_INTERVAL_SECONDS`.

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

### 5. Delete All Completed Jobs
**DELETE** `/api/jobs/completed`

Use this endpoint to clean up old completed jobs from the database.

**Headers:**
- `X-API-KEY: <your PRIVATE_API_KEY>`

**Response:**
```js
{ 
  "deleted_job_ids": ["uuid1", "uuid2", ...],
  "count": 2
}
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
