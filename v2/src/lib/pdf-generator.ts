import { google } from 'googleapis';
import { Readable } from 'stream';

type DriveFolders = {
  se_monthly: string;
  vpr_default: string;
  vpr_by_stage: Record<string, string>;
  jtsg_vmr: string;
  evf: string;
  jtsg_tsvs: string;
  signature_temp: string;
};

type DocTemplates = {
  se_monthly: string;
  vpr: string;
  jtsg_vmr: string;
  evf: string;
};

function findPlaceholderIndex(elements: unknown[], text: string): number {
  if (!elements) return -1;
  for (const el of elements as { paragraph?: { elements?: { textRun?: { content?: string }; startIndex?: number }[] }; table?: { tableRows?: { tableCells?: { content?: unknown[] }[] }[] } }[]) {
    if (el.paragraph) {
      for (const run of el.paragraph.elements || []) {
        const content = run.textRun?.content || '';
        if (content.includes(text)) {
          return (run.startIndex || 0) + content.indexOf(text);
        }
      }
    } else if (el.table) {
      for (const row of el.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          const index = findPlaceholderIndex((cell.content as unknown[]) || [], text);
          if (index !== -1) return index;
        }
      }
    }
  }
  return -1;
}

async function uploadSignatureToDrive(
  drive: ReturnType<typeof google.drive>,
  signatureData: string,
  folderId: string
) {
  if (!signatureData?.startsWith('data:image/')) throw new Error('Invalid signature data format.');
  const base64 = signatureData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const file = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: `temp_signature_${Date.now()}.png`,
      parents: [folderId],
      mimeType: 'image/png',
    },
    media: { mimeType: 'image/png', body: Readable.from(buffer) },
    fields: 'id, webViewLink',
  });
  const fileId = file.data.id!;
  await drive.permissions.create({
    supportsAllDrives: true,
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
  await new Promise((r) => setTimeout(r, 2000));
  const link = await drive.files.get({ supportsAllDrives: true, fileId, fields: 'webContentLink' });
  return { fileId, url: link.data.webContentLink || `https://drive.google.com/uc?export=view&id=${fileId}` };
}

export async function generateSEMonthlyPdf(
  auth: Awaited<ReturnType<typeof import('./google').getGoogleAuth>>,
  parsedData: Record<string, unknown>,
  typedEsName: string,
  signatureData: string,
  config: { templateId: string; folderId: string; signatureFolderId: string }
) {
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const copy = await drive.files.copy({
    supportsAllDrives: true,
    fileId: config.templateId,
    requestBody: { name: `[TEMP] ${parsedData.jobSeekerName || 'Report'}` },
  });
  const tempDocId = copy.data.id!;
  let tempSig: { fileId: string; url: string } | null = null;
  try {
    const requests: object[] = [];
    for (const key in parsedData) {
      const val = parsedData[key];
      requests.push({
        replaceAllText: {
          containsText: { text: `{{${key}}}` },
          replaceText: Array.isArray(val) ? val.join(', ') : String(val ?? ''),
        },
      });
    }
    requests.push({ replaceAllText: { containsText: { text: '{{typedEsName}}' }, replaceText: typedEsName || '' } });
    requests.push({ replaceAllText: { containsText: { text: '{{submissionDate}}' }, replaceText: new Date().toLocaleDateString() } });
    await docs.documents.batchUpdate({ documentId: tempDocId, requestBody: { requests } });

    if (signatureData) {
      tempSig = await uploadSignatureToDrive(drive, signatureData, config.signatureFolderId);
      const placeholder = `__SIGNATURE_${Date.now()}__`;
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: {
          requests: [{ replaceAllText: { containsText: { text: '{{esSignature}}' }, replaceText: placeholder } }],
        },
      });
      const doc = await docs.documents.get({ documentId: tempDocId });
      const idx = findPlaceholderIndex((doc.data.body?.content as unknown[]) || [], placeholder);
      if (idx !== -1) {
        const imageRequests = [
          { deleteContentRange: { range: { startIndex: idx, endIndex: idx + placeholder.length } } },
          {
            insertInlineImage: {
              location: { index: idx },
              uri: tempSig.url,
              objectSize: { height: { magnitude: 75, unit: 'PT' }, width: { magnitude: 150, unit: 'PT' } },
            },
          },
        ];
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: { requests: imageRequests },
        });
      }
    } else {
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: { requests: [{ replaceAllText: { containsText: { text: '{{esSignature}}' }, replaceText: 'Not Signed' } }] },
      });
    }
    const pdfRes = await drive.files.export({ supportsAllDrives: true, fileId: tempDocId, mimeType: 'application/pdf' } as { fileId: string; mimeType: string }, { responseType: 'arraybuffer' });
    return Buffer.from(pdfRes.data as ArrayBuffer);
  } finally {
    await drive.files.delete({ supportsAllDrives: true, fileId: tempDocId });
    if (tempSig) try { await drive.files.delete({ supportsAllDrives: true, fileId: tempSig.fileId }); } catch {}
  }
}

export async function generateVPRPdf(
  auth: Awaited<ReturnType<typeof import('./google').getGoogleAuth>>,
  parsedData: Record<string, unknown>,
  config: { templateId: string; folderId: string }
) {
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const copy = await drive.files.copy({
    supportsAllDrives: true,
    fileId: config.templateId,
    requestBody: { name: `[TEMP] VPR - ${parsedData.ClientName || 'Report'}` },
  });
  const tempDocId = copy.data.id!;
  try {
    const requests = Object.entries(parsedData).map(([k, v]) => ({
      replaceAllText: {
        containsText: { text: `{{${k}}}` },
        replaceText: String(v ?? ''),
      },
    }));
    await docs.documents.batchUpdate({ documentId: tempDocId, requestBody: { requests } });
    const pdfRes = await drive.files.export({ supportsAllDrives: true, fileId: tempDocId, mimeType: 'application/pdf' } as { fileId: string; mimeType: string }, { responseType: 'arraybuffer' });
    return Buffer.from(pdfRes.data as ArrayBuffer);
  } finally {
    await drive.files.delete({ supportsAllDrives: true, fileId: tempDocId });
  }
}

export async function generateJTSGVMRPdf(
  auth: Awaited<ReturnType<typeof import('./google').getGoogleAuth>>,
  parsedData: Record<string, unknown>,
  typedEsName: string,
  signatureData: string,
  config: { templateId: string; folderId: string; signatureFolderId: string }
) {
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const copy = await drive.files.copy({
    supportsAllDrives: true,
    fileId: config.templateId,
    requestBody: { name: `[TEMP] JTSG VMR - ${parsedData.ClientName || 'Report'}` },
  });
  const tempDocId = copy.data.id!;
  let tempSig: { fileId: string; url: string } | null = null;
  try {
    const requests: object[] = [];
    for (const key in parsedData) {
      requests.push({
        replaceAllText: {
          containsText: { text: `{{${key}}}` },
          replaceText: String(parsedData[key] ?? ''),
        },
      });
    }
    await docs.documents.batchUpdate({ documentId: tempDocId, requestBody: { requests } });

    if (signatureData) {
      tempSig = await uploadSignatureToDrive(drive, signatureData, config.signatureFolderId);
      const placeholder = `__SIGNATURE_${Date.now()}__`;
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: { requests: [{ replaceAllText: { containsText: { text: '{{ProviderSignature}}' }, replaceText: placeholder } }] },
      });
      const doc = await docs.documents.get({ documentId: tempDocId });
      const idx = findPlaceholderIndex((doc.data.body?.content as unknown[]) || [], placeholder);
      if (idx !== -1) {
        const imageRequests = [
          { deleteContentRange: { range: { startIndex: idx, endIndex: idx + placeholder.length } } },
          {
            insertInlineImage: {
              location: { index: idx },
              uri: tempSig.url,
              objectSize: { height: { magnitude: 75, unit: 'PT' }, width: { magnitude: 150, unit: 'PT' } },
            },
          },
        ];
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: { requests: imageRequests },
        });
      }
    } else {
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: { requests: [{ replaceAllText: { containsText: { text: '{{ProviderSignature}}' }, replaceText: 'Not Signed' } }] },
      });
    }
    const pdfRes = await drive.files.export({ supportsAllDrives: true, fileId: tempDocId, mimeType: 'application/pdf' } as { fileId: string; mimeType: string }, { responseType: 'arraybuffer' });
    return Buffer.from(pdfRes.data as ArrayBuffer);
  } finally {
    await drive.files.delete({ supportsAllDrives: true, fileId: tempDocId });
    if (tempSig) try { await drive.files.delete({ supportsAllDrives: true, fileId: tempSig.fileId }); } catch {}
  }
}

export async function generateEVFPdf(
  auth: Awaited<ReturnType<typeof import('./google').getGoogleAuth>>,
  parsedData: Record<string, unknown>,
  config: { templateId: string; folderId: string }
) {
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const copy = await drive.files.copy({
    supportsAllDrives: true,
    fileId: config.templateId,
    requestBody: { name: `[TEMP] EVF - ${parsedData.Name || 'Report'}` },
  });
  const tempDocId = copy.data.id!;
  try {
    const requests = Object.entries(parsedData).map(([k, v]) => ({
      replaceAllText: {
        containsText: { text: `{{${k}}}` },
        replaceText: String(v ?? ''),
      },
    }));
    await docs.documents.batchUpdate({ documentId: tempDocId, requestBody: { requests } });
    const pdfRes = await drive.files.export({ supportsAllDrives: true, fileId: tempDocId, mimeType: 'application/pdf' } as { fileId: string; mimeType: string }, { responseType: 'arraybuffer' });
    return Buffer.from(pdfRes.data as ArrayBuffer);
  } finally {
    await drive.files.delete({ supportsAllDrives: true, fileId: tempDocId });
  }
}
