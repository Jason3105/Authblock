import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION!
const bucketName = process.env.AWS_S3_BUCKET_NAME!

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/**
 * Uploads a file buffer to AWS S3 and returns its public URL.
 * @param key      S3 object key, e.g. "certificates/ABC-2025-1234.pdf"
 * @param body     File content as Uint8Array / Buffer
 * @param contentType  MIME type, e.g. "application/pdf"
 */
export async function uploadToS3(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(cmd)

  // Standard S3 virtual-hosted-style public URL
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
  return url
}
