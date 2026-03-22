import { ethers } from 'ethers';
import ContractABI from './ContractABI.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.ALCHEMY_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

export async function getBlockchainContract() {
  if (!CONTRACT_ADDRESS || !RPC_URL || !PRIVATE_KEY) {
    throw new Error('Blockchain configuration is missing in environment variables.');
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ContractABI, wallet);
  
  return { provider, wallet, contract };
}

import QRContractABI from './QRContractABI.json';
export async function getQRBlockchainContract() {
  const QR_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QR_CONTRACT_ADDRESS;
  if (!QR_CONTRACT_ADDRESS || !RPC_URL || !PRIVATE_KEY) {
    throw new Error('QR Blockchain configuration is missing in environment variables.');
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(QR_CONTRACT_ADDRESS, QRContractABI, wallet);
  
  return { provider, wallet, contract };
}
