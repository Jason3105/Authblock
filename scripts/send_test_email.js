import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function sendTestEmail() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.error('Error: SMTP_USER or SMTP_PASS not found in .env.local');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });

  const payload = {
    studentName: 'Jason Doe',
    studentEmail: 'jasonemail28@gmail.com',
    prnNo: '2023015400968440',
    serialNo: 'ABC-1234-5678',
    examination: 'B.E. Computer Engineering',
    branch: 'Computer Engineering',
    session: 'MAY-JUNE 2026',
    sgpi: '9.25',
    cgpi: '8.75',
    remarks: 'Distinction',
    marksheetUrl: 'https://example.com/marksheet',
    certificateUrl: 'https://example.com/certificate',
    verificationUrl: 'https://example.com/verify'
  };

  const mailOptions = {
    from: `"Authblock" <${user}>`,
    to: 'jasonemail28@gmail.com',
    subject: `[TERMINAL_AUTH] Marksheet Issued — ${payload.studentName}`,
    text: `authblock --fetch --student="${payload.studentEmail}"\n\nSYSTEM_ALERT: NEW_DOCUMENT_AVAILABLE\nSTATUS: VERIFIED_AND_TAMPER_PROOF\n\nSTUDENT_NAME: ${payload.studentName}\nPRN_NO: ${payload.prnNo}\nEXAMINATION: ${payload.examination}\nSESSION: ${payload.session}\n\nVerify here: ${payload.verificationUrl}`,
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
  };

  try {
    console.log('Sending terminal-style test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

sendTestEmail();
