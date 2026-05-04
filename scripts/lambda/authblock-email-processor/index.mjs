// authblock-email-processor Lambda Function
// Runtime: Node.js 20.x
// Trigger: SQS Queue (authblock-issuance-queue)
// IAM Role needs: AmazonSQSFullAccess + AmazonSESFullAccess

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({ region: 'ap-south-1' })
const SENDER = process.env.SES_SENDER_EMAIL || 'crce.10246.ceb@gmail.com'

function buildEmailHtml(data) {
  const {
    studentName, prnNo, serialNo, examination, branch,
    session, sgpi, cgpi, remarks, certificateId, issueDate,
    verificationUrl, marksheetUrl, certificateUrl
  } = data

  const isPass = (remarks || '').toUpperCase().includes('PASS') || (remarks || '').toUpperCase().includes('SUCCESS')
  const resultColor  = isPass ? '#16a34a' : '#dc2626'
  const resultBg     = isPass ? '#f0fdf4' : '#fef2f2'
  const resultBorder = isPass ? '#bbf7d0' : '#fecaca'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Academic Result — Authblock</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

  <!-- ── HEADER ───────────────────────────────────────── -->
  <tr>
    <td style="background:#0f172a;border-radius:10px 10px 0 0;padding:28px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1;">AUTHBLOCK</div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:5px;line-height:1.4;">
              Blockchain Credential Platform &middot; Fr. Conceicao Rodrigues College of Engineering
            </div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <div style="display:inline-block;border:1px solid #334155;border-radius:5px;padding:6px 12px;">
              <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Ethereum Sepolia</div>
              <div style="font-size:10px;color:#22c55e;margin-top:2px;font-weight:500;">Verified on Blockchain</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- main card -->
  <tr>
    <td style="background:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:36px;">

      <table width="100%" cellpadding="0" cellspacing="0">

        <!-- Section label -->
        <tr>
          <td style="padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Academic Result Notification</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;margin-top:6px;letter-spacing:-0.3px;">Marksheet Issued</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">
              Your academic marksheet has been officially issued and registered on the Authblock blockchain ledger.
            </div>
          </td>
        </tr>

        <!-- Student identity block -->
        <tr>
          <td style="padding-top:24px;padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">Student</div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${studentName}</div>
            <div style="margin-top:6px;">
              <span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:3px 10px;font-size:11.5px;font-family:'Courier New',Courier,monospace;color:#475569;letter-spacing:0.05em;">${prnNo}</span>
            </div>
          </td>
        </tr>

        <!-- Results row: 3 metric cards side by side -->
        <tr>
          <td style="padding-top:24px;padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:14px;">Performance</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Result -->
                <td style="width:36%;padding-right:8px;vertical-align:top;">
                  <div style="background:${resultBg};border:1px solid ${resultBorder};border-radius:7px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">Result</div>
                    <div style="font-size:14px;font-weight:700;color:${resultColor};">${remarks}</div>
                  </div>
                </td>
                <!-- SGPI -->
                <td style="width:32%;padding-right:8px;vertical-align:top;">
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">SGPI</div>
                    <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1;">${sgpi}</div>
                  </div>
                </td>
                <!-- CGPI -->
                <td style="width:32%;vertical-align:top;">
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:16px 18px;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">CGPI</div>
                    <div style="font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1;">${cgpi}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Academic details list -->
        <tr>
          <td style="padding-top:24px;padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:14px;">Details</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <td style="font-size:12px;color:#64748b;font-weight:500;padding:11px 16px;border-bottom:1px solid #e2e8f0;width:38%;">Examination</td>
                <td style="font-size:12px;color:#0f172a;font-weight:600;padding:11px 16px;border-bottom:1px solid #e2e8f0;">${examination}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;font-weight:500;padding:11px 16px;border-bottom:1px solid #e2e8f0;width:38%;">Branch</td>
                <td style="font-size:12px;color:#0f172a;font-weight:600;padding:11px 16px;border-bottom:1px solid #e2e8f0;">${branch}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="font-size:12px;color:#64748b;font-weight:500;padding:11px 16px;border-bottom:1px solid #e2e8f0;">Session</td>
                <td style="font-size:12px;color:#0f172a;font-weight:600;padding:11px 16px;border-bottom:1px solid #e2e8f0;">${session}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;font-weight:500;padding:11px 16px;border-bottom:1px solid #e2e8f0;">Serial No.</td>
                <td style="font-size:12px;color:#0f172a;font-weight:600;padding:11px 16px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;">${serialNo}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="font-size:12px;color:#64748b;font-weight:500;padding:11px 16px;">Date of Issue</td>
                <td style="font-size:12px;color:#0f172a;font-weight:600;padding:11px 16px;">${issueDate}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Blockchain anchor -->
        <tr>
          <td style="padding-top:24px;">
            <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:14px;">Blockchain Anchor</div>
            <div style="background:#0f172a;border-radius:7px;padding:18px 20px;">
              <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:6px;">Certificate ID</div>
              <div style="font-size:12px;font-family:'Courier New',Courier,monospace;color:#e2e8f0;word-break:break-all;line-height:1.6;">${certificateId}</div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1e293b;">
                <div style="font-size:11px;color:#475569;line-height:1.5;">
                  This credential is immutably registered on the Ethereum Sepolia blockchain and can be independently verified against the on-chain hash at any time.
                </div>
              </div>
              <div style="margin-top:16px;display:flex;gap:12px;">
                <a href="${verificationUrl}" style="background:#3b82f6;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:5px;font-size:12px;font-weight:600;text-align:center;display:inline-block;">Verify on Blockchain</a>
                <a href="${marksheetUrl}" style="background:transparent;border:1px solid #475569;color:#e2e8f0;text-decoration:none;padding:10px 16px;border-radius:5px;font-size:12px;font-weight:600;text-align:center;display:inline-block;">Download Marksheet</a>
                <a href="${certificateUrl}" style="background:transparent;border:1px solid #475569;color:#e2e8f0;text-decoration:none;padding:10px 16px;border-radius:5px;font-size:12px;font-weight:600;text-align:center;display:inline-block;">View Certificate</a>
              </div>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- ── FOOTER ─────────────────────────────────────── -->
  <tr>
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:24px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:12px;font-weight:600;color:#374151;">Fr. Conceicao Rodrigues College of Engineering</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Bandra (W), Mumbai &mdash; 400 050. INDIA &nbsp;&middot;&nbsp; Autonomous College under University of Mumbai</div>
          </td>
        </tr>
        <tr>
          <td style="padding-top:14px;border-top:1px solid #e2e8f0;margin-top:14px;">
            <!-- spacer trick for border -->
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-size:11px;color:#94a3b8;line-height:1.7;">
              This is a system-generated notification from the Authblock blockchain credential platform.
              Marksheets and certificates can be downloaded by logging in to the Authblock student portal.
              Please do not reply to this email — this mailbox is not monitored.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

function buildPlainText(data) {
  const sep = '─'.repeat(48)
  return `AUTHBLOCK — ACADEMIC RESULT NOTIFICATION
Fr. Conceicao Rodrigues College of Engineering
${sep}

Marksheet Issued

Student : ${data.studentName}
PRN     : ${data.prnNo}

${sep}
RESULT  : ${data.remarks}
SGPI    : ${data.sgpi}
CGPI    : ${data.cgpi}
${sep}

Examination  : ${data.examination}
Branch       : ${data.branch}
Session      : ${data.session}
Serial No.   : ${data.serialNo}
Date Issued  : ${data.issueDate}

${sep}
Certificate ID
${data.certificateId}
${sep}

This credential is registered on the Ethereum Sepolia blockchain.

Verify Document: ${data.verificationUrl}
Download Marksheet: ${data.marksheetUrl}
View Certificate: ${data.certificateUrl}

─
Fr. Conceicao Rodrigues College of Engineering
Bandra (W), Mumbai - 400 050. INDIA

System-generated email. Do not reply.`
}

export const handler = async (event) => {
  console.log('[Lambda] Processing', event.Records.length, 'SQS record(s)')

  for (const record of event.Records) {
    let payload
    try {
      const sqsBody = JSON.parse(record.body)
      payload = typeof sqsBody.Message === 'string' ? JSON.parse(sqsBody.Message) : sqsBody
    } catch (err) {
      console.error('[Lambda] Failed to parse record body:', err)
      continue
    }

    const { studentName, studentEmail, prnNo } = payload

    if (!studentEmail) {
      console.warn(`[Lambda] No email for PRN ${prnNo} — skipping`)
      continue
    }

    const cmd = new SendEmailCommand({
      Source: `Authblock - Fr. CRCE <${SENDER}>`,
      Destination: { ToAddresses: [studentEmail] },
      Message: {
        Subject: {
          Data: `Academic Marksheet Issued — ${studentName}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: { Data: buildEmailHtml(payload), Charset: 'UTF-8' },
          Text: { Data: buildPlainText(payload), Charset: 'UTF-8' },
        },
      },
    })

    try {
      const result = await ses.send(cmd)
      console.log(`[Lambda] Email sent to ${studentEmail} | PRN: ${prnNo} | MessageId: ${result.MessageId}`)
    } catch (err) {
      console.error(`[Lambda] Failed to send to ${studentEmail}:`, err)
      throw err
    }
  }

  return { statusCode: 200, body: 'OK' }
}
