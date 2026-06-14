import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Create an S3 client lazily inside each call so that missing environment
 * variables only crash the routes that actually need S3, not every Lambda
 * that happens to import this module at cold-start time.
 */
function getS3Client(): S3Client {
  const region = process.env.S3_REGION
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[s3] Missing S3 credentials. Set S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY ' +
        'in Amplify App Settings → Environment Variables.'
    )
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME
  if (!bucket) {
    throw new Error(
      '[s3] S3_BUCKET_NAME is not set. Add it to Amplify App Settings → Environment Variables.'
    )
  }
  return bucket
}

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
  const s3Client = getS3Client()
  const bucketName = getBucketName()
  const region = process.env.S3_REGION!

  const cmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(cmd)

  // Standard S3 virtual-hosted-style public URL
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}
