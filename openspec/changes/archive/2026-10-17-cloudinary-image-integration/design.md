# Design

## Context
See `proposal.md` for background and motivation. The backend is an Express 5 application with authentication via JWT Bearer tokens and database connectivity to TiDB Cloud using Sequelize and mysql2. The frontend is a Next.js 16 App Router application. Currently, images are written as base64 files to local disk and proxied through Express.

## Goals / Non-Goals

**Goals:**
- Zero disk-write image uploads using in-memory streaming directly to Cloudinary.
- Strict file validation: magic bytes file inspection, whitelist of mime types (jpeg, png, webp), and configurable size limits (default 5MB).
- Predictable asset naming and folder hierarchy on Cloudinary (`dhtn/students/:student_id` or `dhtn/events/:event_id`).
- Store `secure_url` in `images.url` and `public_id`, width, height, format, bytes in `images.metadata` JSON column.
- Robust failure recovery: immediate destruction of newly uploaded Cloudinary asset if database write fails.
- Safe replacement: delete previous Cloudinary asset only after new record is saved and if unreferenced by other records.
- Next.js remote patterns configuration for `res.cloudinary.com` to render optimized images with `next/image`.
- Comprehensive automated tests with Cloudinary mocking.

**Non-Goals:**
- Creating a separate microservice for image processing.
- Modifying student avatar URLs unless using the shared image upload pipeline.
- Altering existing mock data fixtures outside the production path.

## Decisions

### 1. In-Memory Streaming Upload (`multer.memoryStorage` + `streamifier` + `cloudinary.uploader.upload_stream`)
- **Rationale**: Eliminates local file system access, avoiding permission issues, disk cleanup cron jobs, and statefulness in containerized or serverless hosting environments.
- **Alternatives considered**: Disk storage with temporary files (rejected due to disk management overhead and failure leak risks).

### 2. Magic-Byte File Validation
- **Rationale**: Attackers can spoof the `Content-Type` header or client filename. Checking magic bytes (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46` / `WEBP` for WebP) in memory before streaming ensures file integrity.
- **Alternatives considered**: Relying only on `multer` fileFilter `file.mimetype` (rejected as insufficient security).

### 3. Schema Preservation via `images.metadata` JSON Column
- **Rationale**: The TiDB `images` table already includes a JSON `metadata` column. Storing `{ public_id, width, height, format, bytes, month }` avoids schema migration while providing complete asset tracking for lifecycle operations.
- **Alternatives considered**: Adding a new column `public_id` via `ALTER TABLE` (unnecessary complexity since `metadata` is native JSON).

### 4. Cloudinary Rollback & Reference-Safe Deletion
- **Rationale**: If TiDB rejects a record (e.g. FK constraint or DB timeout), the uploaded Cloudinary asset must be destroyed immediately to avoid orphaned storage costs. When updating or deleting, we query TiDB to verify no other row references the same `public_id` before calling `cloudinary.uploader.destroy()`.

## Risks / Trade-offs

- **[Risk] Cloudinary upload timeout / network error** → Set timeout on Cloudinary stream and return standard `sendError(res, 'Image upload failed', error.message, 502)`.
- **[Risk] Cloudinary API credential exposure** → Read credentials exclusively from server-side environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`). Never pass them to the client or prefix with `NEXT_PUBLIC_`.
- **[Risk] Next.js remote image rendering error** → Add `res.cloudinary.com` to `remotePatterns` in `next.config.mjs` and keep fallback placeholder handler in `ImageListClient`.
