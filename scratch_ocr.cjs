const fs = require('fs');
let code = fs.readFileSync('src/app/api/ocr/route.ts', 'utf8');

// 1. Insert block extraction before the Name section
const nameHeader = '  // ── Name ──────────────────────────────────────────────────────────────────';
if (code.includes(nameHeader)) {
  const blockCode = `  // ── Flattened Block Extraction (Handles OCR column reading order) ──
  const blockMatch = normalized.match(/CS[A-Z]\\d{3}\\s+([A-Za-z\\s]+?)\\s+(Bachelor\\s+of\\s+Engineering[A-Za-z0-9\\s-]*?)\\s+(Computer\\s+Engineering|Mechanical\\s+Engineering|Electrical\\s+Engineering|Civil\\s+Engineering|Information\\s+Technology|Electronics\\s+(?:and\\s+)?Communication)\\s+([A-Za-z0-9-]+)\\s+(\\d{15,16})/i)
  
  let blockName = '', blockExam = '', blockBranch = '', blockSession = '', blockPrn = ''
  if (blockMatch) {
    blockName = blockMatch[1].trim()
    blockExam = blockMatch[2].trim()
    blockBranch = blockMatch[3].trim()
    blockSession = blockMatch[4].trim()
    blockPrn = blockMatch[5].trim()
    console.log('[OCR Parse] Extracted block values:', { blockName, blockExam, blockBranch, blockSession, blockPrn })
  }

` + nameHeader;
  code = code.replace(nameHeader, blockCode);
} else {
  console.log('Could not find Name header');
}

// 2. Replace name assignment
code = code.replace(
  'const name = nameRaw ? normalizeName(nameRaw) : \'\'',
  'const name = nameRaw ? normalizeName(nameRaw) : (blockName ? normalizeName(blockName) : \'\')'
);

// 3. Replace prn assignment
code = code.replace(
  '    /(?:^|\\s)(\\d{16})(?=\\s|$)/\n  ])',
  '    /(?:^|\\s)(\\d{16})(?=\\s|$)/\n  ]) || blockPrn'
);

// 4. Update examination regex and assignment
code = code.replace(
  '    // OCR often outputs \'Sem-v\' (lowercase) for \'Sem-V\'\n    /(Bachelor\\s+of\\s+Engineering\\s+Sem-[a-zA-Z]+)/i\n  ])\n  const examination = examRaw ? normalizeExamination(examRaw) : \'\'',
  '    // Flexible fallback to catch Sem Testing or Sem V\n    /(Bachelor\\s+of\\s+Engineering\\s+Sem[- ]?[a-zA-Z]+)/i\n  ]) || blockExam\n  const examination = examRaw ? normalizeExamination(examRaw) : (blockExam ? normalizeExamination(blockExam) : \'\')'
);

// 5. Update branch assignment
code = code.replace(
  '    /(Electronics\\s+(?:and\\s+)?Communication)(?=\\s|$)/i\n  ])',
  '    /(Electronics\\s+(?:and\\s+)?Communication)(?=\\s|$)/i\n  ]) || blockBranch'
);

// 6. Update session regex and assignment
code = code.replace(
  '    /Session\\s*:?\\s*([A-Z][a-z]+-\\d{4})/i,\n    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\\d{4})/i\n  ])',
  '    /Session\\s*:?\\s*([A-Z][a-z]+-\\d{4})/i,\n    /Session\\s*:?\\s*([A-Za-z0-9-]+)/i,\n    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\\d{4})/i\n  ]) || blockSession'
);

fs.writeFileSync('src/app/api/ocr/route.ts', code);
console.log('File updated successfully.');
