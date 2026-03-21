import os
import json
from dotenv import load_dotenv, set_key
from web3 import Web3
from solcx import install_solc, compile_source

# 1. Load Environment Variables
env_path = '.env.local'
load_dotenv(env_path)

RPC_URL = os.getenv("ALCHEMY_RPC_URL")
if not RPC_URL:
    RPC_URL = os.getenv("NEXT_PUBLIC_SEPOLIA_RPC_URL")

PRIVATE_KEY = os.getenv("PRIVATE_KEY")

if not RPC_URL or not PRIVATE_KEY:
    print("Error: Missing ALCHEMY_RPC_URL or PRIVATE_KEY in .env.local")
    exit(1)

# Connect to Sepolia
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    print("Failed to connect to Ethereum node.")
    exit(1)

print(f"Connected to Sepolia successfully. Block {w3.eth.block_number}")

# 2. Compile Contract
print("Installing solc compiler...")
install_solc('0.8.20')

with open("contracts/CertificateRegistry.sol", "r") as file:
    contract_source = file.read()

print("Compiling contract...")
compiled_sol = compile_source(
    contract_source,
    output_values=['abi', 'bin'],
    solc_version='0.8.20'
)

contract_id, contract_interface = compiled_sol.popitem()
bytecode = contract_interface['bin']
abi = contract_interface['abi']

# 3. Deploy Contract
account = w3.eth.account.from_key(PRIVATE_KEY)
address = account.address
print(f"Deploying from address: {address}")

# Check balance
balance = w3.eth.get_balance(address)
print(f"Account Balance: {w3.from_wei(balance, 'ether')} ETH")

if balance == 0:
    print("Account has 0 ETH. You need Sepolia ETH to deploy.")
    exit(1)

CertificateRegistry = w3.eth.contract(abi=abi, bytecode=bytecode)

print("Building transaction...")
nonce = w3.eth.get_transaction_count(address)
tx = CertificateRegistry.constructor().build_transaction({
    'chainId': 11155111, # Sepolia chain id
    'gas': 2000000,
    'maxFeePerGas': w3.to_wei('15', 'gwei'),
    'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
    'nonce': nonce,
})

print("Signing transaction...")
signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)

print("Sending transaction...")
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

print(f"Transaction Hash: {w3.to_hex(tx_hash)}")
print("Waiting for receipt...")

tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
contract_address = tx_receipt.contractAddress

print(f"Contract deployed successfully at address: {contract_address}")

# 4. Save to .env.local
set_key(env_path, "NEXT_PUBLIC_CONTRACT_ADDRESS", contract_address)
print("Updated .env.local with NEXT_PUBLIC_CONTRACT_ADDRESS")

# Also save the ABI for the frontend
abi_file = "src/lib/ContractABI.json"
with open(abi_file, "w") as f:
    json.dump(abi, f, indent=2)

print(f"Saved ABI down to {abi_file}")
