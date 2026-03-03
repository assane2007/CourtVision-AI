# ⚙️ CourtVision API (v5.3.0)

High-performance Fastify backend powering the CourtVision ecosystem. Handles intensive AI simulation workloads and 3D reconstruction pipelines.

## 🚀 Key Modules

*   **Shadow League (Simulation)**: Probabilistic matchup engine with asynchronous background workers.
*   **Gaussian Splatting (Spatial)**: Managed processing queue for video-to-3D reconstruction.
*   **Auth (Supabase)**: Robust JWT-based authentication and RLS security.
*   **Queue (BullMQ)**: Distributed task queues supported by Redis.

## 🛠️ Deployment

1.  **Environment Variables**:
    *   `DATABASE_URL`: Supabase Postgres connection.
    *   `REDIS_URL`: Endpoint for BullMQ task management.
    *   `SUPABASE_SERVICE_KEY`: For backend-level database operations.
2.  **Infrastructure**:
    *   Requires a Redis instance with persistence for Shadow League job state.
3.  **Run**: `npm run start` or `docker-compose up`.

---
**Status: READY FOR PRODUCTION.** ⚡🦾
