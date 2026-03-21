const http = require('http');

const payload = JSON.stringify({
  serial_no: "SN-999",
  student_name: "TEST BLOCKCHAIN",
  prn_no: "2023010000000001",
  examination: "Bachelor of Engineering Sem-IV",
  branch: "Computer Engineering",
  session_name: "June-2025",
  sgpi: "9.50",
  cgpi: "9.20",
  date: "15-08-2025",
  remarks: "SUCCESSFUL",
  issued_by: "ba20d293-68f4-4a47-bc97-40af27ba42bc", // Random UUID for testing if foreign key allows it or null
  subjects: [
    { code: "TEST101", title: "BLOCKCHAIN 101", credits: "4", grade: "O", gp: "10", cp: "4", cpgp: "40" }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/marksheets/issue',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
