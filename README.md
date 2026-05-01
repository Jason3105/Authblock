# Authblock

**Authblock** is an enterprise-grade decentralized application (dApp) designed to eliminate academic credential fraud. It provides a secure, end-to-end pipeline for generating, storing, and verifying academic marksheets using the Ethereum blockchain and AWS cloud infrastructure.

## 🌟 Key Features

- **Tamper-proof Verification**: Anchors cryptographic hashes of academic documents onto the Ethereum blockchain, ensuring data immutability and provenance.
- **Automated Document Generation**: Dynamically generates PDF marksheets and certificates from admin-uploaded CSV or manual data entries.
- **Secure Cloud Storage**: Safely stores generated documents in Amazon S3, accessible via secure, permanent URLs.
- **Event-Driven Notifications**: Leverages AWS SNS, SQS, and Lambda to asynchronously dispatch "Document Issued" emails via Amazon SES without blocking the main application flow.
- **Admin & Student Portals**: Dedicated dashboards for administrators to upload and manage documents, and for students to view and verify their credentials.
- **Multi-Factor Authentication (MFA)**: Secure access powered by Firebase Auth.
- **OCR Verification (Optional)**: Includes endpoints for scanned document verification via OCR.space or Google Cloud Vision APIs.

---

## 🏗️ System Architecture & Workflow

The system follows a strict pipeline to ensure that every document issued is both tamper-proof and highly available.

### Document Issuance Flow
1. **Admin Upload**: An authorized administrator uploads student marksheet data via the Admin Dashboard.
2. **Generation**: The application generates PDF documents (Marksheet and Certificate) using `jspdf` and `html2canvas`.
3. **Storage**: PDFs are securely uploaded to **Amazon S3**. S3 returns a permanent URL for document retrieval.
4. **Blockchain Anchoring**: 
   - A cryptographic hash (SHA-256) of the document content is generated.
   - This hash is stored on the **Ethereum (Sepolia)** network via a Smart Contract transaction.
   - The transaction hash is saved in the local database as proof of anchoring.
5. **Event Notification**: An issuance event is published to **Amazon SNS**, which is then picked up by **Amazon SQS** to trigger an **AWS Lambda** function.
6. **Delivery**: The Lambda function uses **Amazon SES** to send an email to the student with links to their documents and the blockchain verification page.

---

## 💻 Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Web3 Integration**: [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/), [ethers.js](https://docs.ethers.org/)
- **PDF Generation**: `jspdf`, `html2canvas`, `@react-pdf/renderer`
- **Data Visualization**: `recharts`
- **Icons**: `lucide-react`

### Backend & Infrastructure
- **Database**: [NeonDB](https://neon.tech/) (Serverless PostgreSQL)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
- **Cloud Provider**: AWS (S3, SNS, SQS, Lambda, SES, CloudWatch, CloudTrail)
- **Smart Contracts**: Solidity (deployed on Ethereum Sepolia Testnet)
- **RPC Providers**: Alchemy / Infura

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MetaMask (or another Web3 wallet)
- AWS Account (with IAM credentials)
- Firebase Project
- NeonDB Account
- WalletConnect Project ID

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/authblock.git
   cd authblock
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file and fill in your credentials.
   ```bash
   cp .env.example .env.local
   ```
   *(See [Environment Variables](#-environment-variables) for more details).*

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your `.env.local` file:

**Web3 & Blockchain**
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from WalletConnect Cloud
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`: Infura RPC URL for Sepolia
- `ALCHEMY_RPC_URL`: Alchemy RPC URL
- `PRIVATE_KEY`: Deployment private key

**Database**
- `DATABASE_URL`: NeonDB PostgreSQL connection string

**Firebase Authentication**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**OCR APIs (Optional)**
- `OCR_SPACE_API_KEY`
- `GOOGLE_VISION_API_KEY`

---

## 🛡️ Security & Access Control

- **IAM Scoping**: AWS access is restricted via IAM Groups with specific inline policies (S3, SNS, SES, etc.) to ensure the Principle of Least Privilege.
- **Environment Management**: Critical keys (AWS Secret Access Keys, Private Keys) are strictly managed and never committed to version control.
- **Data Integrity**: While documents are accessible via S3 URLs, the true "Source of Truth" remains the blockchain hash. Any tampering with an S3 file will result in a hash mismatch, instantly flagging the document as invalid.

---

## 📊 Maintenance & Monitoring

- **Health Checks**: System health is continuously monitored via AWS CloudWatch Alarms.
- **Audit Trails**: AWS CloudTrail logs are maintained to track unauthorized API activity and ensure compliance with data protection standards.
- **Reputation Management**: SES bounce and complaint rates are actively monitored to maintain a high sender reputation and prevent AWS account suspension.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/authblock/issues) if you want to contribute.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
