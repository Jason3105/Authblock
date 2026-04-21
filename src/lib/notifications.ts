import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const snsClient = new SNSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export interface IssuanceNotificationPayload {
  studentName: string
  studentEmail: string
  prnNo: string
  serialNo: string
  examination: string
  branch: string
  session: string
  sgpi: string
  cgpi: string
  remarks: string
  marksheetUrl: string
  certificateUrl: string
  certificateId: string
  verificationUrl: string
  issueDate: string
}

/**
 * Publishes an issuance event to AWS SNS.
 * Flow: SNS Topic → SQS Queue → Lambda (authblock-email-processor) → SES → Student inbox
 * Non-fatal: errors are logged but never break the issuance response.
 */
export async function publishIssuanceNotification(payload: IssuanceNotificationPayload): Promise<void> {
  const topicArn = process.env.AWS_SNS_TOPIC_ARN

  if (!topicArn) {
    console.warn('[SNS] AWS_SNS_TOPIC_ARN not set — skipping notification')
    return
  }

  if (!payload.studentEmail) {
    console.warn('[SNS] No student email for PRN:', payload.prnNo, '— skipping notification')
    return
  }

  try {
    const cmd = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(payload),
      Subject: `Marksheet Issued — ${payload.studentName}`,
    })
    const result = await snsClient.send(cmd)
    console.log('[SNS] ✓ Event published. MessageId:', result.MessageId, '| Student:', payload.studentEmail)
  } catch (err: any) {
    console.error('[SNS] Failed to publish notification:', err.message)
  }
}
