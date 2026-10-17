# Proposal

## Why
Currently, image files are uploaded as base64 strings and written synchronously to the local backend disk filesystem, serving them via an authenticated Express proxy endpoint. This is inefficient, non-scalable for production/cloud environments, and risks orphaned files and memory bloat. Integrating Cloudinary with direct memory streaming and persisting metadata in TiDB provides secure, high-performance image storage, transformations, and global CDN delivery.

## What Changes
- Implement in-memory streaming upload to Cloudinary using `multer.memoryStorage()`, `streamifier`, and the official Cloudinary SDK v2.
- Validate actual image contents using magic-byte file signature verification and configurable file size limits, preventing MIME-type spoofing.
- Persist `secure_url` and Cloudinary metadata (including `public_id`, dimensions, format) into TiDB's existing `images` table (`url` and `metadata` JSON columns) using parameterized queries / Sequelize.
- Support atomic image replacement and rollback on database failures, ensuring unreferenced Cloudinary assets are safely cleaned up.
- Remove dependence on local disk file writes and fallback placeholders from production flows.
- Configure Next.js `remotePatterns` for `res.cloudinary.com` and update the frontend `ImageListClient` component to upload and render real images.

## Capabilities

### New Capabilities
- `image-storage`: Manages image uploads, validation, Cloudinary asset storage, metadata persistence in TiDB, and secure retrieval/rendering.

### Modified Capabilities
<!-- None: no existing specs exist in openspec/specs -->

## Impact
- **Backend**:
  - `backend/config/cloudinary.js`: Cloudinary SDK initialization and upload/delete helpers.
  - `backend/middlewares/upload.js`: Multer memory storage and magic-byte validation middleware.
  - `backend/routes/imageRoutes.js`: Upload middleware integration for image endpoints.
  - `backend/controllers/ImageController.js`: Stream upload to Cloudinary, database persistence, and rollback handling.
  - `backend/.env.example`: Cloudinary environment variable placeholders.
- **Frontend**:
  - `frontend/next.config.mjs`: Adding `res.cloudinary.com` remote image pattern.
  - `frontend/src/services/images.ts`: Supporting multipart `FormData` payloads.
  - `frontend/src/app/(member)/images/_components/ImageListClient.tsx`: Live preview and file upload handling.
- **Database**:
  - TiDB `images` table: Reusing existing `url` and `metadata` JSON columns. No destructive migrations.
