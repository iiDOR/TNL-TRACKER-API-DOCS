export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TNL Tracker API",
    version: "1.0.0",
    description: `## TNL Tracker Backend API

Backend for the **TamilNadu Logistics (TNL)** fleet tracking app — a Tauri desktop client used by TNL VTC members to log delivery jobs, view convoy events, and monitor live driver telemetry.

The server is a **Bun + TypeScript** HTTP server hosted at \`tnl.wisp.uno\`. All endpoints are CORS-enabled.

### Authentication

| Scheme | How to send | Used by |
|--------|-------------|---------|
| **AdminToken** | \`Authorization: Bearer <ADMIN_UI_TOKEN>\` | Admin-only management routes |
| **DevKey** | \`Authorization: Bearer <dev_key>\` | Third-party integrations via allowlisted keys |
| **TelemetryKey** | \`Authorization: Bearer <TELEMETRY_KEY>\` | In-app live telemetry push |

Public endpoints require no authentication.

### Rate Limits
- Job submission: 20 req/min per IP
- Public job list: 20 req/min per IP
- Telemetry push: 1 req/s per \`tmp_id\`
- Job share creation/lookup: 20 req/min per IP`,
    contact: { name: "TNL Dev", url: "https://tnl.wisp.uno" },
  },
  servers: [{ url: "https://tnl.wisp.uno", description: "Production" }],
  components: {
    securitySchemes: {
      AdminToken: { type: "http", scheme: "bearer", description: "ADMIN_UI_TOKEN from server env" },
      DevKey: { type: "apiKey", in: "header", name: "Authorization", description: "Bearer <dev_key> from allowlist" },
      TelemetryKey: { type: "http", scheme: "bearer", description: "TELEMETRY_KEY from server env" },
    },
    schemas: {
      EventData: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          date: { type: "string", format: "date-time" },
          server: { type: "string" },
          game: { type: "string", enum: ["ets2", "ats"] },
          drivers: { type: "integer" },
          cap: { type: "integer" },
          rsvp: { type: "boolean" },
          route: { type: "string" },
          dist: { type: "string" },
          featured: { type: "boolean" },
          banner: { type: "string", format: "uri" },
          map: { type: "string", format: "uri" },
          meetup_at: { type: "string", format: "date-time" },
          _source: { type: "string", enum: ["tnl", "truckersmp"] },
        },
      },
      Allowlist: {
        type: "object",
        required: ["tmp_ids", "emails", "allowed_pages", "dev_keys", "job_webhooks"],
        properties: {
          tmp_ids: { type: "array", items: { type: "string" } },
          emails: { type: "array", items: { type: "string" } },
          allowed_pages: { type: "array", items: { type: "string" } },
          dev_keys: { type: "array", items: { type: "string" } },
          job_webhooks: { type: "array", items: { type: "string", format: "uri" } },
        },
      },
      JobPayload: {
        type: "object",
        required: ["jobID"],
        properties: {
          jobID: { type: "integer" },
          driver: { type: "object", properties: { username: { type: "string" }, steamID: { type: "string" }, truckersmpId: { type: "string" } } },
          source: { type: "object", properties: { city: { type: "object", properties: { name: { type: "string" } } } } },
          destination: { type: "object", properties: { city: { type: "object", properties: { name: { type: "string" } } } } },
          cargo: { type: "object", properties: { name: { type: "string" }, mass: { type: "number" }, damage: { type: "number" } } },
          income: { type: "number" },
          distanceDriven: { type: "number" },
        },
      },
      UpdateManifest: {
        type: "object",
        required: ["version", "notes", "pub_date", "platforms"],
        properties: {
          version: { type: "string", example: "0.1.2" },
          notes: { type: "string" },
          pub_date: { type: "string", format: "date-time" },
          platforms: {
            type: "object",
            properties: {
              "windows-x86_64": {
                type: "object",
                properties: {
                  signature: { type: "string" },
                  url: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  tags: [
    { name: "Health", description: "Simple liveness probe — returns `ok` when the server is up and accepting requests." },
    { name: "Auth", description: "Allowlist management and access control. The allowlist is a JSON file on disk containing TruckersMP IDs, emails, page flags, dev keys, and webhook URLs. Admin routes let you read and replace it atomically." },
    { name: "Events", description: "Server-side cache of convoy events merged from two sources: the TNL internal API (`api.tamilnadulogistics.in`) and TruckersMP VTC attending events (VTC 70030). The cache is refreshed every 35 minutes automatically. Clients should poll this endpoint instead of calling upstream APIs directly." },
    { name: "Jobs", description: "Delivery job pipeline. The Tauri app submits completed jobs here; they are written to an on-disk outbox and bulk-flushed to OpenSearch every 30 seconds. Jobs are also written to Postgres for persistent storage. Webhook URLs in the allowlist receive a Discord-compatible embed for each new job." },
    { name: "Job Events", description: "Lightweight event log for job lifecycle transitions — `job_started` when a driver accepts a job and `job_cancelled` when it is abandoned before delivery. Stored in Postgres. Useful for attrition analysis and leaderboard adjustments." },
    { name: "Job Shares", description: "Short-link sharing for individual job deliveries. Generates an 8-character alphanumeric code (e.g. `TNL3X7PQ`) that resolves to the full job payload for 30 days. Used by the app's share-to-Discord feature." },
    { name: "Realtime", description: "Live driver telemetry backed by an OpenSearch realtime index. The in-app telemetry module pushes speed, fuel, location, and current job data once per second while a session is active. Drivers are considered active if seen within the last 5 minutes." },
    { name: "Changelog", description: "Serves parsed sections of the server-side `CHANGELOG.md` file keyed by version string. The Tauri app fetches this after a successful auto-update to display release notes in the UI." },
    { name: "Updates", description: "Tauri v2 auto-updater manifests. The app checks `/update/patch/latest` first (hotfixes), then falls back to `/update/latest` (stable releases). Manifests follow the Tauri updater JSON format with version, release notes, pub_date, and per-platform download URL + signature." },
    { name: "TruckersMP Proxy", description: "CORS-safe reverse proxy for the TruckersMP public API. Browser and Tauri clients cannot call `api.truckersmp.com` directly due to CORS restrictions; these endpoints forward the request server-side and return the response with correct headers. Responses are cached to avoid hammering the upstream." },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns the plain text string `ok` with HTTP 200. Used by uptime monitors and load balancers to verify the process is alive and the port is accepting connections.",
        responses: { "200": { description: "Server is up", content: { "text/plain": { schema: { type: "string", example: "ok" } } } } },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    "/admin/check": {
      get: {
        tags: ["Auth"],
        summary: "Check if a user is on the allowlist",
        description: "Public endpoint. Pass either a TruckersMP ID (`tmp_id`) or an email address. Returns the plain text string `\"true\"` if the value appears in the allowlist's `tmp_ids` or `emails` arrays respectively, `\"false\"` otherwise. Used by the Tauri app on startup to gate access to protected pages.",
        parameters: [
          { name: "tmp_id", in: "query", schema: { type: "string" }, description: "TruckersMP numeric ID (e.g. `1234567`)" },
          { name: "email", in: "query", schema: { type: "string" }, description: "Driver email address" },
        ],
        responses: {
          "200": { description: "`\"true\"` if the user is allowlisted, `\"false\"` if not", content: { "text/plain": { schema: { type: "string", enum: ["true", "false"] } } } },
        },
      },
    },
    "/admin/allowlist": {
      get: {
        tags: ["Auth"],
        summary: "Get the full allowlist",
        description: "Returns the complete allowlist JSON loaded from disk. Contains all TruckersMP IDs, emails, feature flags (`allowed_pages`), dev API keys, and Discord webhook URLs. Requires `AdminToken`.",
        security: [{ AdminToken: [] }],
        responses: {
          "200": { description: "Current allowlist", content: { "application/json": { schema: { $ref: "#/components/schemas/Allowlist" } } } },
          "401": { description: "Missing or invalid AdminToken" },
        },
      },
      put: {
        tags: ["Auth"],
        summary: "Replace the full allowlist",
        description: "Atomically replaces the on-disk `allowlist.json` with the provided body. The server validates the schema before writing — missing required fields return 400. Changes take effect immediately on the next request that reads the allowlist (no restart required). Requires `AdminToken`.",
        security: [{ AdminToken: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Allowlist" } } } },
        responses: {
          "200": { description: "Allowlist saved and applied" },
          "400": { description: "Body fails schema validation — response includes the validation error" },
          "401": { description: "Missing or invalid AdminToken" },
        },
      },
    },
    "/page-config": {
      get: {
        tags: ["Auth"],
        summary: "Get enabled pages and job webhooks",
        description: "Public endpoint. Returns the subset of the allowlist that the Tauri frontend needs at startup: which feature pages are enabled (`allowed_pages`) and the list of Discord webhook URLs to fire when a job is submitted (`job_webhooks`). Webhook URLs are included so the client can display them in the admin UI without needing the full AdminToken.",
        responses: {
          "200": {
            description: "Page feature flags and webhook list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    allowed_pages: { type: "array", items: { type: "string" }, description: "Feature page identifiers that are currently enabled (e.g. `jobs`, `events`, `saveedit`)" },
                    job_webhooks: { type: "array", items: { type: "string" }, description: "Discord webhook URLs that receive job completion embeds" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Events ──────────────────────────────────────────────────────────────
    "/events": {
      get: {
        tags: ["Events"],
        summary: "Get cached merged event list",
        description: `Returns the server-side event cache as a JSON object. Events are merged from two upstream sources:

- **TNL API** (\`api.tamilnadulogistics.in/api/events/\`) — internal TNL convoy events
- **TruckersMP VTC** (\`api.truckersmp.com/v2/vtc/70030/events/attending\`) — events TNL VTC (ID 70030) has RSVP'd to on TruckersMP

The server refreshes the cache every **35 minutes** in the background. Deduplication is performed using the numeric ID extracted from event banner/map image filenames. Each event carries a \`_source\` field (\`"tnl"\` or \`"truckersmp"\`) so clients can filter by origin.

Returns 503 only during the first few seconds after a cold server start before the initial fetch completes.`,
        responses: {
          "200": {
            description: "Event cache",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    fetched_at: { type: "string", format: "date-time" },
                    tnl_count: { type: "integer" },
                    tmp_count: { type: "integer" },
                    events: { type: "array", items: { $ref: "#/components/schemas/EventData" } },
                  },
                },
              },
            },
          },
          "503": { description: "Cache not ready yet (first startup)" },
        },
      },
    },

    // ── Jobs ────────────────────────────────────────────────────────────────
    "/jobs": {
      post: {
        tags: ["Jobs"],
        summary: "Submit a completed job",
        description: `Called by the Tauri app when a driver completes a delivery. The payload is appended to an on-disk pending queue (\`jobs_pending.json\`) immediately and returns 200 — the actual OpenSearch write happens asynchronously every 30 seconds via a background flush loop.

**Flow:**
1. App sends the full SCS telemetry job object
2. Server validates \`jobID\` exists and body is under 50KB
3. Payload appended to pending queue on disk
4. Background timer bulk-indexes pending jobs into OpenSearch every 30s
5. After successful flush, all configured Discord webhooks receive an embed

**Rate limit:** 20 requests per minute per IP address.`,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/JobPayload" } } } },
        responses: {
          "200": { description: "Accepted" },
          "400": { description: "Missing jobID or invalid JSON" },
          "413": { description: "Payload too large (>50KB)" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/jobs/status": {
      get: {
        tags: ["Jobs"],
        summary: "Get flush pipeline status",
        description: "Returns diagnostic information about the OpenSearch flush pipeline. Shows whether OpenSearch is configured, how many jobs are sitting in the pending queue waiting to be flushed, the timestamp of the last flush attempt, any error from the last failed flush, and the timestamp of the last successful flush. Useful for diagnosing delivery gaps when jobs appear submitted but don't show up in the leaderboard.",
        security: [{ AdminToken: [] }],
        responses: {
          "200": {
            description: "Status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    opensearch_configured: { type: "boolean" },
                    pending_count: { type: "integer" },
                    last_flush_at: { type: "integer", nullable: true },
                    last_flush_error: { type: "string", nullable: true },
                    last_flush_success_at: { type: "integer", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admin/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List jobs (admin)",
        description: "Paginated job list from OpenSearch, ordered by submission time descending. Supports offset-based pagination via `size` and `from`. Returns the raw OpenSearch document source for each hit. Requires `AdminToken`.",
        security: [{ AdminToken: [] }],
        parameters: [
          { name: "size", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
          { name: "from", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Job list" }, "401": { description: "Unauthorized" } },
      },
      delete: {
        tags: ["Jobs"],
        summary: "Delete a job by ID (admin)",
        security: [{ AdminToken: [] }],
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Deleted" }, "400": { description: "Missing id" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List jobs (dev key)",
        description: "Paginated job list for third-party integrations (e.g. Discord bots, external leaderboards). Requires a `dev_key` from the allowlist sent as `Authorization: Bearer <key>` or as the `key` query parameter. Supports filtering by `driver` username or `tmp_id`. Page-based pagination (page 1 = first `size` results).",
        security: [{ DevKey: [] }],
        parameters: [
          { name: "size", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "driver", in: "query", schema: { type: "string" } },
          { name: "tmp_id", in: "query", schema: { type: "string" } },
          { name: "key", in: "query", schema: { type: "string" }, description: "Alternative to Authorization header" },
        ],
        responses: { "200": { description: "Paginated job list" }, "401": { description: "Invalid key" } },
      },
    },
    "/api/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get single job by ID (dev key)",
        description: "Fetches a single job document from OpenSearch by its numeric `jobID`. Returns the full job payload including driver info, cargo, source/destination cities, income, and distance driven. Used by the job share viewer page to render a specific delivery's details.",
        security: [{ DevKey: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Job document" }, "401": { description: "Invalid key" }, "404": { description: "Not found" } },
      },
    },
    "/api/public/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Public job list (no auth)",
        description: "Unauthenticated job list endpoint. Same filtering and pagination as `/api/jobs` but requires no key. Intended for public leaderboard pages and embeds. Rate limited to 20 requests per minute per IP. Maximum page size is 1000.",
        parameters: [
          { name: "size", in: "query", schema: { type: "integer", default: 50, maximum: 1000 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "driver", in: "query", schema: { type: "string" } },
          { name: "tmp_id", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paginated job list" }, "429": { description: "Rate limited" } },
      },
    },
    "/admin/test-job": {
      post: {
        tags: ["Jobs"],
        summary: "Insert a synthetic test job into Postgres",
        description: "Inserts a fake job record directly into the Postgres `job_started_events` table with synthetic data. Used during development and deployment verification to confirm the Postgres connection is working and that the jobs pipeline is healthy without needing a real Tauri client session.",
        security: [{ AdminToken: [] }],
        responses: { "200": { description: "Test job inserted" }, "401": { description: "Unauthorized" } },
      },
    },
    "/admin/test-webhook": {
      post: {
        tags: ["Jobs"],
        summary: "Fire job_webhooks with a real job",
        description: "Fetches the specified job (or the most recent job if no `job_id` given) and fires all Discord webhooks in `job_webhooks` with its embed. Used to test webhook formatting and confirm that Discord channels are receiving job notifications correctly without waiting for a real driver submission.",
        security: [{ AdminToken: [] }],
        parameters: [{ name: "job_id", in: "query", schema: { type: "integer" }, description: "Specific job ID, or omit for latest" }],
        responses: { "200": { description: "Webhooks fired" }, "401": { description: "Unauthorized" }, "404": { description: "No jobs" } },
      },
    },
    "/admin/push-jobs-webhook": {
      post: {
        tags: ["Jobs"],
        summary: "Bulk-push jobs to job_webhooks",
        description: "Queries OpenSearch for a page of jobs (optionally filtered by `tmp_id`) and fires all Discord webhooks for each one sequentially. Used to backfill a webhook channel after it was misconfigured or the webhook URL changed. Use with care — sends one Discord message per job.",
        security: [{ AdminToken: [] }],
        parameters: [
          { name: "tmp_id", in: "query", schema: { type: "string" } },
          { name: "size", in: "query", schema: { type: "integer", default: 50, maximum: 1000 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Pushed" }, "401": { description: "Unauthorized" } },
      },
    },

    // ── Job Events ──────────────────────────────────────────────────────────
    "/job-started": {
      post: {
        tags: ["Job Events"],
        summary: "Record a job_started event",
        description: "Called by the Tauri app when a driver accepts a new delivery job in-game (before it is completed). Stored in the Postgres `job_started_events` table. Used to calculate job attrition rate (started vs completed). Returns 503 if the Postgres connection is not configured on the server.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Event recorded in Postgres" }, "503": { description: "Postgres not configured" } },
      },
    },
    "/job-cancelled": {
      post: {
        tags: ["Job Events"],
        summary: "Record a job_cancelled event",
        description: "Called by the Tauri app when a driver abandons a job before delivering it. Stored in the Postgres `job_cancelled_events` table. Paired with `job_started` events to compute abandonment rates per driver. Returns 503 if Postgres is not configured.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Event recorded in Postgres" }, "503": { description: "Postgres not configured" } },
      },
    },
    "/api/job-events": {
      get: {
        tags: ["Job Events"],
        summary: "Query job events (dev key)",
        description: "Returns paginated job lifecycle events (started/cancelled) from Postgres. Filter by `type` to get only one kind, or omit for all. Requires a `dev_key` from the allowlist.",
        security: [{ DevKey: [] }],
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["started", "cancelled"] }, description: "Omit for all" },
          { name: "size", in: "query", schema: { type: "integer", default: 50 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Paginated events" }, "401": { description: "Invalid key" } },
      },
    },
    "/admin/job-events": {
      get: {
        tags: ["Job Events"],
        summary: "Query job events (admin)",
        description: "Same as `/api/job-events` but uses `AdminToken` instead of a dev key, and uses offset-based pagination (`from`) rather than page numbers. Supports deleting individual records via DELETE on the same path.",
        security: [{ AdminToken: [] }],
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["all", "started", "cancelled"], default: "all" } },
          { name: "size", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
          { name: "from", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Events list" }, "401": { description: "Unauthorized" } },
      },
      delete: {
        tags: ["Job Events"],
        summary: "Delete a job event (admin)",
        security: [{ AdminToken: [] }],
        parameters: [
          { name: "id", in: "query", required: true, schema: { type: "integer" } },
          { name: "type", in: "query", required: true, schema: { type: "string", enum: ["started", "cancelled"] } },
        ],
        responses: { "200": { description: "Deleted" }, "401": { description: "Unauthorized" } },
      },
    },

    // ── Job Shares ──────────────────────────────────────────────────────────
    "/job-share": {
      post: {
        tags: ["Job Shares"],
        summary: "Create a share code for a job",
        description: "Stores the full job payload in the Postgres `job_shares` table and returns a unique 8-character alphanumeric code (e.g. `TNL3X7PQ`). The code is valid for 30 days and can be shared as a link in Discord. Rate limited to 20 req/min per IP.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/JobPayload" } } } },
        responses: {
          "200": { description: "Share code", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, code: { type: "string", example: "TNL3X7PQ" } } } } } },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/job-share/{code}": {
      get: {
        tags: ["Job Shares"],
        summary: "Retrieve a job by share code",
        description: "Looks up the share code in Postgres and returns the full job payload if the code exists and has not expired (30-day TTL). Returns 404 if the code is unknown or past its expiry date. Rate limited to 20 req/min per IP.",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string", example: "TNL3X7PQ" } }],
        responses: {
          "200": { description: "Job payload" },
          "404": { description: "Code not found or expired" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/admin/job-shares": {
      get: {
        tags: ["Job Shares"],
        summary: "List all share codes (admin)",
        security: [{ AdminToken: [] }],
        parameters: [
          { name: "size", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "from", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Share code list" }, "401": { description: "Unauthorized" } },
      },
    },
    "/admin/job-shares/{code}": {
      patch: {
        tags: ["Job Shares"],
        summary: "Update expiry of a share code (admin)",
        security: [{ AdminToken: [] }],
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { expires_at: { type: "string", format: "date-time" } } } } } },
        responses: { "200": { description: "Updated" }, "401": { description: "Unauthorized" } },
      },
      delete: {
        tags: ["Job Shares"],
        summary: "Delete a share code (admin)",
        security: [{ AdminToken: [] }],
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "401": { description: "Unauthorized" } },
      },
    },

    // ── Realtime ────────────────────────────────────────────────────────────
    "/telemetry": {
      post: {
        tags: ["Realtime"],
        summary: "Push live telemetry for a driver",
        description: `Called by the Tauri app's telemetry module once per second while a game session is active. Upserts the driver's current state into the OpenSearch realtime index keyed by \`tmp_id\`.

The document is used to power the live driver map and the \`/active\` endpoint. Documents older than 5 minutes are excluded from the active list.

**Rate limit:** 1 request per second per \`tmp_id\`. Excess requests return 429.

Requires \`TelemetryKey\` — the shared secret configured as \`TELEMETRY_KEY\` in the server environment.`,
        security: [{ TelemetryKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tmp_id", "username"],
                properties: {
                  tmp_id: { type: "string" },
                  username: { type: "string" },
                  speed: { type: "number" },
                  fuel: { type: "number" },
                  location: { type: "object" },
                  job: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Stored" }, "401": { description: "Unauthorized" }, "429": { description: "Rate limited" } },
      },
    },
    "/active": {
      get: {
        tags: ["Realtime"],
        summary: "Get currently active drivers",
        description: "Queries the OpenSearch realtime index for all driver documents updated within the last 5 minutes. Returns the count and the full telemetry payload for each active driver. Returns 503 if OpenSearch is not configured on the server.",
        responses: {
          "200": {
            description: "Active users",
            content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" }, users: { type: "array", items: { type: "object" } } } } } },
          },
          "503": { description: "OpenSearch not configured" },
        },
      },
    },
    "/user/{tmp_id}": {
      get: {
        tags: ["Realtime"],
        summary: "Get a specific driver's latest telemetry",
        description: "Fetches the most recent telemetry document for a single driver identified by their TruckersMP ID. The response includes the full telemetry payload plus an `active` boolean indicating whether the document was updated within the last 5 minutes.",
        parameters: [{ name: "tmp_id", in: "path", required: true, schema: { type: "string" }, description: "TruckersMP numeric ID" }],
        responses: {
          "200": { description: "Driver telemetry + active flag" },
          "404": { description: "User not found" },
          "503": { description: "OpenSearch not configured" },
        },
      },
    },

    // ── Changelog ───────────────────────────────────────────────────────────
    "/changelog": {
      get: {
        tags: ["Changelog"],
        summary: "Get parsed changelog for a version",
        description: "Parses `CHANGELOG.md` on the server and returns the sections for the requested version as structured JSON. The Tauri app calls this after completing an auto-update to display a \"What's New\" modal to the user. Returns 404 if the version heading is not found in the file.",
        parameters: [{ name: "version", in: "query", required: true, schema: { type: "string", example: "0.1.2" }, description: "Exact version string matching the `## [0.x.x]` heading in CHANGELOG.md" }],
        responses: {
          "200": {
            description: "Changelog sections",
            content: { "application/json": { schema: { type: "object", properties: { version: { type: "string" }, sections: { type: "array", items: { type: "object" } } } } } },
          },
          "404": { description: "Version not found in CHANGELOG.md" },
        },
      },
    },
    "/admin/changelog-raw": {
      get: {
        tags: ["Changelog"],
        summary: "Get raw CHANGELOG.md (admin)",
        description: "Returns the full raw markdown content of `CHANGELOG.md` from disk. Used by the admin UI to display and edit the changelog without direct server file access.",
        security: [{ AdminToken: [] }],
        responses: { "200": { description: "Raw markdown text", content: { "text/plain": { schema: { type: "string" } } } }, "401": { description: "Unauthorized" } },
      },
      put: {
        tags: ["Changelog"],
        summary: "Replace CHANGELOG.md (admin)",
        description: "Overwrites `CHANGELOG.md` on disk with the request body. Changes are reflected immediately on the next `/changelog` request. Send the complete file content — partial updates are not supported.",
        security: [{ AdminToken: [] }],
        requestBody: { required: true, content: { "text/plain": { schema: { type: "string" } } } },
        responses: { "200": { description: "Saved" }, "401": { description: "Unauthorized" } },
      },
    },

    // ── Updates ─────────────────────────────────────────────────────────────
    "/update/latest": {
      get: {
        tags: ["Updates"],
        summary: "Get stable release manifest",
        description: "Returns the Tauri v2 auto-updater manifest for the current stable release. The Tauri app checks this endpoint as a fallback after checking `/update/patch/latest`. If a newer `version` is returned than what the client has installed, Tauri downloads and installs the update. Returns 404 if no manifest has been pushed yet.",
        responses: {
          "200": { description: "Update manifest", content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateManifest" } } } },
          "404": { description: "No manifest configured" },
        },
      },
    },
    "/update/patch/latest": {
      get: {
        tags: ["Updates"],
        summary: "Get patch/hotfix manifest",
        description: "The Tauri app checks this endpoint **first** on every startup. If a valid manifest is present, it takes priority over the stable manifest at `/update/latest`. Used to push urgent hotfixes between full releases. The admin can clear the active patch manifest via DELETE `/admin/update-patch-manifest` to stop serving it. Returns 404 when no patch is active — the app then falls through to the stable endpoint.",
        responses: {
          "200": { description: "Patch manifest", content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateManifest" } } } },
          "404": { description: "No patch available" },
        },
      },
    },
    "/admin/update-manifest": {
      post: {
        tags: ["Updates"],
        summary: "Push a stable release manifest (admin)",
        description: "Writes the provided manifest to `update-manifest.json` on disk. This becomes the response body for `GET /update/latest`. Push this after cutting a new stable GitHub release. The manifest must follow the Tauri v2 updater format including `version`, `notes`, `pub_date`, and per-platform `url` + `signature`.",
        security: [{ AdminToken: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateManifest" } } } },
        responses: { "200": { description: "Saved" }, "401": { description: "Unauthorized" } },
      },
    },
    "/admin/update-patch-manifest": {
      post: {
        tags: ["Updates"],
        summary: "Push a patch manifest (admin)",
        description: "Activates a hotfix update by writing the manifest to `update-patch-manifest.json`. Once pushed, all clients will immediately see the patch on their next startup check via `GET /update/patch/latest`. Use the same Tauri updater manifest format as the stable manifest.",
        security: [{ AdminToken: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateManifest" } } } },
        responses: { "200": { description: "Patch manifest saved and now active" }, "401": { description: "Unauthorized" } },
      },
      delete: {
        tags: ["Updates"],
        summary: "Remove the active patch manifest (admin)",
        description: "Deletes `update-patch-manifest.json` from disk. After this call, `GET /update/patch/latest` returns 404 and clients fall back to the stable manifest. Use this to deactivate a hotfix once all clients have updated.",
        security: [{ AdminToken: [] }],
        responses: { "200": { description: "Patch manifest removed — `/update/patch/latest` now returns 404" }, "401": { description: "Unauthorized" } },
      },
    },

    // ── TruckersMP Proxy ────────────────────────────────────────────────────
    "/api/tmp/player/{id}": {
      get: {
        tags: ["TruckersMP Proxy"],
        summary: "Get TruckersMP player profile",
        description: "Proxies `api.truckersmp.com/v2/player/:id` server-side. The TruckersMP API does not send CORS headers, so browser and Tauri clients cannot call it directly. This endpoint forwards the request and returns the response with correct CORS headers. Response is cached for 1 hour to reduce upstream load.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "TMP player object" }, "502": { description: "TMP unreachable" } },
      },
    },
    "/api/tmp/vtc/{id}/events/attending": {
      get: {
        tags: ["TruckersMP Proxy"],
        summary: "Get events a VTC is attending",
        description: "Proxies `api.truckersmp.com/v2/vtc/:id/events/attending` server-side. Returns the list of TruckersMP events that the specified VTC has RSVP'd to. Used internally by the events cache refresh to merge TMP attending events with TNL events. The TNL VTC ID is **70030**. Cached for 15 minutes.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", example: 70030 } }],
        responses: { "200": { description: "TMP VTC events" }, "502": { description: "TMP unreachable" } },
      },
    },

    // Accessories endpoints removed — accessories.json is bundled as a Tauri
    // app resource and loaded locally; the server no longer serves it.
  },
};
