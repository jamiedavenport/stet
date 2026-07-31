// The one seeded file that is not an image. A PDF is the shortest real
// document format that can be written without a library, and writing one
// keeps every asset row backed by bytes something can actually open.

/** A one-page PDF showing `title` and `lines` in Helvetica. */
export function onePagePdf(title: string, lines: readonly string[]): Uint8Array {
  const text = [
    'BT',
    '/F1 20 Tf 72 760 Td',
    `(${escapeText(title)}) Tj`,
    '/F1 11 Tf 0 -28 TD 16 TL',
    ...lines.map((line) => `(${escapeText(line)}) '`),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  // The cross-reference table is byte offsets into everything above, which is
  // why the body is built first and only then measured.
  const startxref = body.length;
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
  ].join('\n');
  const trailer = `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, 'latin1');
}

/** The three characters that are syntax inside a PDF string literal. */
function escapeText(value: string): string {
  return value.replace(/([\\()])/g, '\\$1');
}
