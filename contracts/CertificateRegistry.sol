// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    address public owner;
    
    // We map a hash (either pdf_hash or data_hash) to the timestamp it was registered.
    // This allows storing them in separate transactions easily.
    mapping(bytes32 => uint256) public registeredHashes;

    event HashRegistered(bytes32 indexed hash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Register a generic hash
    function registerHash(bytes32 _hash) external onlyOwner {
        require(registeredHashes[_hash] == 0, "Hash already registered");
        registeredHashes[_hash] = block.timestamp;
        emit HashRegistered(_hash, block.timestamp);
    }

    // Verify if a hash exists
    function verifyHash(bytes32 _hash) external view returns (bool, uint256) {
        uint256 ts = registeredHashes[_hash];
        return (ts > 0, ts);
    }
}
