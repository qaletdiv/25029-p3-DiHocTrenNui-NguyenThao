# Tasks

## 1. Backend Configuration & Cloudinary Service

- [x] 1.1 Update `backend/.env.example` with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `MAX_FILE_SIZE_MB` placeholders and verify env candidates load properly
- [x] 1.2 Implement Cloudinary streaming helper methods (`uploadStream`, `deleteAsset`, `isConfigured`) in `backend/config/cloudinary.js` using `streamifier` and the official SDK

## 2. In-Memory Upload Middleware & Validation

- [x] 2.1 Implement `backend/middlewares/upload.js` with `multer.memoryStorage()`, configurable size limit, and magic-byte signature validation (JPEG, PNG, WebP)
- [x] 2.2 Wire upload error handling to return standardized errors via `sendError`

## 3. Image Controller & Route Integration

- [x] 3.1 Update `backend/routes/imageRoutes.js` to attach `upload.single('image')` to image creation and update endpoints
- [x] 3.2 Update `backend/controllers/ImageController.js` to stream uploads directly to Cloudinary, persist `secure_url` and `metadata.public_id` in TiDB, and handle rollback on database write failures
- [x] 3.3 Implement safe image replacement and deletion logic in `ImageController.js`, verifying no duplicate record references before calling Cloudinary asset destruction

## 4. Frontend Integration & Remote Patterns

- [x] 4.1 Update `frontend/next.config.mjs` to add `res.cloudinary.com` to `images.remotePatterns`
- [x] 4.2 Update `frontend/src/services/images.ts` to support `FormData` multipart payloads for image creation and updates
- [x] 4.3 Update `frontend/src/app/(member)/images/_components/ImageListClient.tsx` to handle file selection, preview local object URLs, submit multipart `FormData`, and render persisted Cloudinary URLs

## 5. Verification & Automated Tests

- [x] 5.1 Create `backend/tests/test_cloudinary_image.js` testing magic-byte validation, mock Cloudinary stream upload, TiDB persistence, replacement, and rollback
- [x] 5.2 Execute test suite and verify all test assertions pass
- [x] 5.3 Run existing backend verification suite (`npm test`) and frontend production build (`npm run build`) to ensure zero regressions
