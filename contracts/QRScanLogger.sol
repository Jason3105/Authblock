// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QRScanLogger {
    address public owner;
    
    // Maps scan hash (e.g. hash of IP, PRN, Name) to block timestamp
    mapping(bytes32 => uint256) public scanLogs;

    event QRScanned(bytes32 indexed scanHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Log a QR code scan
    function logScan(bytes32 _scanHash) external onlyOwner {
        // We can allow multiple scans of the same data if needed, but usually 
        // the hash includes a timestamp or unique ID if it needs to be unique.
        // Assuming each scan has a unique hash (derived from token + timestamp)
        scanLogs[_scanHash] = block.timestamp;
        emit QRScanned(_scanHash, block.timestamp);
    }

    // Verify a scan log exists
    function getScanTimestamp(bytes32 _scanHash) external view returns (bool, uint256) {
        uint256 ts = scanLogs[_scanHash];
        return (ts > 0, ts);
    }
}
