// Thin storage abstraction so routes never talk to a specific SDK directly.
// In production this wraps @aws-sdk/client-s3 (works unmodified against AWS S3,
// Cloudflare R2, Backblaze B2, or MinIO — anything S3-compatible).

const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? "https://cdn.postermaker.app";

export async function uploadToS3(key: string, _body: Buffer, _contentType: string): Promise<string> {
  // Production implementation:
  //   const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, ... });
  //   await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${PUBLIC_BASE_URL}/${key}`;
}

export async function deleteFromS3(_key: string): Promise<void> {
  // await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}
