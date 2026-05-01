# Project Context: Authblock (Detailed)

**Authblock** is an enterprise-grade decentralized application (dApp) designed to eliminate academic credential fraud. It provides a secure, end-to-end pipeline for generating, storing, and verifying academic marksheets using the Ethereum blockchain and AWS cloud infrastructure.

---

## 1. System Architecture & Workflow
The system follows a strict pipeline to ensure that every document issued is both tamper-proof and highly available.

### Document Issuance Flow
1.  **Admin Upload**: An authorized administrator uploads student marksheet data (CSV/Manual) via the Admin Dashboard.
2.  **Generation**: The server generates two PDF documents (Marksheet and Certificate) using `jspdf` and `html2canvas`.
3.  **Storage**: 
    - The PDFs are uploaded to **Amazon S3** via `src/lib/s3.ts`.
    - S3 returns a permanent URL for document retrieval.
4.  **Blockchain Anchoring**: 
    - A cryptographic hash (SHA-256) of the document content is generated.
    - This hash is stored on the **Ethereum (Sepolia)** network via a Smart Contract transaction.
    - The transaction hash is saved in the local database as proof of anchoring.
5.  **Event Notification**:
    - An issuance event is published to **Amazon SNS**.
    - **Amazon SQS** picks up the event and triggers an **AWS Lambda** function.
6.  **Delivery**: The Lambda function uses **Amazon SES** to send a "Document Issued" email to the student with links to the S3 documents and the blockchain verification page.

---

## 2. Detailed Service Roles

### AWS Cloud Components
- **Amazon S3**: Acts as the "Object Store." All certificates are stored here. Access is managed via IAM policies and (optionally) CloudFront for edge delivery.
- **Amazon SNS & SQS**: Provide the "Decoupling Layer." By using SNS/SQS, the main application doesn't have to wait for emails to be sent, ensuring a fast UI response for admins.
- **AWS Lambda**: The "Compute Worker." Specifically handles the overhead of formatting notification emails and communicating with SES.
- **Amazon SES**: The "Communication Bridge." Handles transactional emails. It is monitored for bounce/complaint rates to maintain a high sender reputation.
- **Amazon CloudWatch**:
    - **Log Groups**: Monitor Lambda execution and application errors.
    - **Metrics**: Track S3 bucket growth and SNS message throughput.
    - **Alarms**: Notify developers via email/Slack if system errors spike.
- **AWS CloudTrail**: The "Audit Log." Records exactly who (which IAM user) accessed or deleted a certificate in S3, ensuring compliance with data protection standards.

### Blockchain & Web3
- **Smart Contracts**: Written in Solidity, deployed on Sepolia. They maintain a mapping of `DocumentID => ContentHash`.
- **Ethers.js / Viem**: Used to interact with the blockchain provider (Infura/Alchemy) and handle transaction signing.

### Database & Auth
- **NeonDB**: A serverless PostgreSQL database used to store student records, metadata, and document references.
- **Firebase Auth**: Manages secure login for Admins and Students, supporting Multi-Factor Authentication (MFA).

---

## 3. Security & Access Control
- **IAM Scoping**: Teammates are restricted via **IAM Groups** with specific inline policies (S3, SNS, SES, etc.) to ensure the Principle of Least Privilege.
- **Environment Management**: Critical keys (AWS Secret Access Keys, Private Keys) are stored in `.env.local` and never committed to version control.
- **Public/Private Access**: While documents have S3 URLs, the "Source of Truth" is the blockchain hash. If an S3 file is tampered with, the hash will no longer match the on-chain record, flagging the document as invalid.

---

## 4. Maintenance & Monitoring
- **Health Checks**: Monitored via CloudWatch Alarms.
- **Audit Trails**: CloudTrail logs should be reviewed monthly for unauthorized API activity.
- **Reputation Management**: SES bounce rates must be kept below 5% to avoid AWS account suspension.
