import nodemailer from 'nodemailer'

// Commenting out AWS SNS Implementation
/*
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const snsClient = new SNSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
*/

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
 * Publishes an issuance event using SMTP via nodemailer.
 * Non-fatal: errors are logged but never break the issuance response.
 */
export async function publishIssuanceNotification(payload: IssuanceNotificationPayload): Promise<void> {
  if (!payload.studentEmail) {
    console.warn('[SMTP] No student email for PRN:', payload.prnNo, '— skipping notification')
    return
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from: `"Authblock" <${process.env.SMTP_USER}>`,
      to: payload.studentEmail,
      subject: `Marksheet Issued — ${payload.studentName}`,
      text: `Hello ${payload.studentName},\n\nYour marksheet for PRN ${payload.prnNo} has been issued.\n\nView Marksheet: ${payload.marksheetUrl}\nView Certificate: ${payload.certificateUrl}\nVerify here: ${payload.verificationUrl}\n\nBest Regards,\nAuthblock Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
            body {
              font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
              background-color: #090917;
              color: #cbd5e1;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
            }
            .terminal {
              max-width: 600px;
              margin: 20px auto;
              background-color: #0c0c1d;
              border: 1px solid #334155;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            }
            .terminal-header {
              background-color: #1e293b;
              padding: 12px 15px;
              border-bottom: 1px solid #334155;
            }
            .dot {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              display: inline-block;
              margin-right: 6px;
              vertical-align: middle;
            }
            .dot-red { background-color: #ef4444; }
            .dot-yellow { background-color: #f59e0b; }
            .dot-green { background-color: #10b981; }
            .terminal-title {
              color: #94a3b8;
              font-size: 12px;
              margin-left: 10px;
              font-weight: bold;
              vertical-align: middle;
            }
            .terminal-content {
              padding: 30px;
              font-size: 14px;
            }
            .prompt { color: #10b981; margin-right: 8px; }
            .command { color: #38bdf8; }
            .output { color: #94a3b8; margin: 15px 0; }
            .success { color: #34d399; font-weight: bold; margin: 20px 0; border-left: 3px solid #34d399; padding-left: 15px; }
            .key { color: #818cf8; font-weight: bold; }
            .value { color: #f8fafc; }
            .grid { display: block; margin: 20px 0; }
            .grid-item { margin-bottom: 8px; }
            .btn-container {
              margin-top: 35px;
              border-top: 1px solid #334155;
              padding-top: 25px;
            }
            .btn {
              display: block;
              padding: 14px;
              margin-bottom: 12px;
              text-decoration: none;
              text-align: center;
              border-radius: 6px;
              font-weight: bold;
              font-size: 13px;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .btn-primary {
              background-color: #3b82f6;
              color: #ffffff !important;
              box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39);
            }
            .btn-secondary {
              border: 1px solid #475569;
              color: #94a3b8 !important;
              background-color: transparent;
            }
            .btn-secondary:hover {
              background-color: #1e293b;
              border-color: #64748b;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #475569;
              margin-top: 30px;
              letter-spacing: 1px;
            }
            .timestamp { color: #64748b; float: right; font-size: 10px; margin-top: 2px; }
            @media only screen and (max-width: 600px) {
              body { padding: 10px; }
              .terminal-content { padding: 20px; }
              .btn { padding: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="terminal">
            <div class="terminal-header">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
              <span class="terminal-title">authblock — secure-verification-system</span>
              <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="terminal-content">
              <div><span class="prompt">$</span><span class="command">authblock --fetch --student="${payload.studentEmail}"</span></div>
              <div class="output">Establishing secure connection to Ethereum... [DONE]</div>
              
              <div class="success">
                [SYSTEM_ALERT]: NEW_DOCUMENT_AVAILABLE<br>
                STATUS: VERIFIED_AND_TAMPER_PROOF
              </div>

              <div class="grid">
                <div class="grid-item"><span class="key">STUDENT_NAME:</span> <span class="value">${payload.studentName}</span></div>
                <div class="grid-item"><span class="key">PRN_NO:</span> <span class="value">${payload.prnNo}</span></div>
                <div class="grid-item"><span class="key">EXAMINATION:</span> <span class="value">${payload.examination}</span></div>
                <div class="grid-item"><span class="key">SESSION:</span> <span class="value">${payload.session}</span></div>
                <div class="grid-item"><span class="key">STATUS:</span> <span class="value" style="color: #10b981;">SUCCESS</span></div>
              </div>

              <div><span class="prompt">$</span><span class="command">authblock --verify-integrity</span></div>
              <div class="output">
                Checking blockchain hashes... [100%]<br>
                Encryption state: AES-256-GCM<br>
                Signature: ETH_VERIFIED
              </div>

              <div class="btn-container">
                <a href="${payload.verificationUrl}" class="btn btn-primary">VERIFY_ON_BLOCKCHAIN</a>
                <a href="${payload.marksheetUrl}" class="btn btn-secondary">DOWNLOAD_MARKSHEET</a>
                <a href="${payload.certificateUrl}" class="btn btn-secondary">VIEW_CERTIFICATE</a>
              </div>
            </div>
          </div>
          <div class="footer">
            -- END OF SYSTEM TRANSMISSION --<br>
            &copy; ${new Date().getFullYear()} AUTHBLOCK PROTOCOL | CONFIDENTIAL
          </div>
        </body>
        </html>
      `,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('[SMTP] ✓ Email sent. MessageId:', info.messageId, '| Student:', payload.studentEmail)
  } catch (err: any) {
    console.error('[SMTP] Failed to send email:', err.message)
  }
}
