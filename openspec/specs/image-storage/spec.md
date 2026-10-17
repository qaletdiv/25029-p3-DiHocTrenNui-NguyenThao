# image-storage Specification

## Purpose
Provides secure, scalable image upload, Cloudinary cloud storage, metadata persistence in TiDB, and global CDN delivery across the application.

## Requirements

### Requirement: Secure image upload validation
The backend API SHALL accept multipart/form-data image uploads, enforce file size limits, verify file magic bytes, and reject invalid or spoofed image files.

#### Scenario: Valid image file upload
- **WHEN** an authenticated user uploads an allowed image file (JPEG, PNG, or WebP) within the configured size limit
- **THEN** the backend accepts the file and streams it directly to Cloudinary without persisting temporary files to disk

#### Scenario: Spoofed MIME type rejection
- **WHEN** a client submits a non-image file with a forged `image/jpeg` or `image/png` header
- **THEN** magic-byte signature validation rejects the request with a 400 Bad Request error

#### Scenario: File size limit exceeded
- **WHEN** a client uploads a file exceeding the configured maximum file size
- **THEN** the upload middleware rejects the request with an explicit size limit error

### Requirement: Cloudinary asset management and rollback
The system SHALL stream accepted image buffers to Cloudinary under a predictable folder structure, persist the resulting `secure_url` and `public_id` in TiDB, and rollback Cloudinary assets if database transactions fail.

#### Scenario: Successful image creation with metadata
- **WHEN** an image upload to Cloudinary succeeds
- **THEN** the `secure_url` is saved to the `url` column and `public_id`, dimensions, and format are stored in the `metadata` JSON column of the `images` table in TiDB

#### Scenario: Database failure rollback
- **WHEN** an image is uploaded to Cloudinary but the subsequent database write fails
- **THEN** the system triggers immediate cleanup of the uploaded Cloudinary asset via its `public_id` and surfaces the original database error without masking

### Requirement: Atomic image replacement
The system SHALL allow updating an existing image record with a new file, deleting the obsolete Cloudinary asset only after the database update successfully commits.

#### Scenario: Image replacement succeeds
- **WHEN** a user updates an image record with a new image file
- **THEN** the new file is uploaded to Cloudinary, the database record is updated, and the previous Cloudinary asset is destroyed only if no other database record references it

#### Scenario: Keep existing image when no new file is provided
- **WHEN** an update request is submitted without a new file attachment
- **THEN** the existing `url` and `metadata` are retained in TiDB and no Cloudinary assets are deleted

### Requirement: Remote image rendering in Next.js
The frontend application SHALL configure Next.js remote patterns for `res.cloudinary.com` to render optimized images directly from Cloudinary.

#### Scenario: Render Cloudinary image in image list
- **WHEN** an image record contains a Cloudinary `secure_url`
- **THEN** the Next.js `Image` component renders the image directly from `res.cloudinary.com` with responsive sizing and fallback on load error
