const functions = require("firebase-functions");
const { google } = require("googleapis");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const admin = require('firebase-admin');
admin.initializeApp();

// --- CONFIGURATION ---
const PROJECT_ID = "joshua-tree-reports-app";

// SE Monthly Report Config
const DOC_TEMPLATE_ID = "1lZmk6tB3JZoIleh262sWLbKRB436qURpGIDiuo44wvY";
const DRIVE_FOLDER_ID = "1gtS4QgPo8_GojYCgSbRG6g15hoFznuc5";
const SIGNATURE_REPO_ID = "1qXu-UWmLfGuQbY4Zn1ErrB-3ewrqe9Kz";

// Vocational Progress Report Config
const VPR_TEMPLATE_ID = "1_mcHkKUOcKOUo_0addAGoYlaA2JChWqWv5Ny6hwy58Q";
const VPR_DRIVE_FOLDER_ID_DEFAULT = "1p9RmaTJjuXTe121BDtNTvBABTHCpU89v";
const VPR_SHEET_ID = "1pxZL61iP1oj8xbQrhfxXzyj3fWe6gWPl3zSeB9xsUCs";
const VPR_FOLDER_MAP = {
    "Job Development": "1sWb8OUa41CaJLTwWXabg0j5_Tj0h8Ht-",
    "Training / OS 1": "1YqH8x9LFhB5jwWulqlBE8ZxwJzxMZ1zl",
    "Training / OS 2": "1DAh3NS_S56Fdp6nYaZ09kwb4mBUZPFG3",
    "Stabilization / ES": "1QdHJArUtb8cEntesUJCRuqT9n_NNdrlZ",
    "Work Readiness Training": "1AWW1NO7ms0ktsOM5GnztAnV_vojuMvfe",
    "IJP": "1zr7-RBApmkcvpAKEDnnVBR2xAAfzlFkm",
    "CWAT": "18FRs2Z3SffTuQTfoyHkbTxLJA_08ARBg",
    "Job Coaching": "1G9pHC2sd_cuj9HCsvtxLx2NwqPFfm2fV",
    "Work Evaluation": "1GROq6YXXgPjs1IwLJanEwmd1JIxtI0_B"
};

// JTSG Vocational Monthly Report Config
const JTSG_VMR_TEMPLATE_ID = "1TAj_ef5TWXGmA2vxZrtxCto2A4aj-L9XPQce5ToZ8aI";
const JTSG_VMR_DRIVE_FOLDER_ID = "1RGt46juVjc_uLoZh9jYPGA4vKJXeQsxr"; 

// Employment Verification Form Config
const EVF_TEMPLATE_ID = "1vh2_7-rk_cMymO2teEjJPl6uEz0g7b2Fo1mKvkItb_4";
const EVF_DRIVE_FOLDER_ID = "1A5b28hPazBAB61xaouMRRiK_cUGUOCiw";

// JTSG Time Sheet for Vocational Services Config
const JTSG_TSVS_DRIVE_FOLDER_ID = "1kRDGja0UI7FnzAbInMbPVfm3VKsIUQdZ";


/**
 * Helper functions to get secrets and an authenticated client
 */
async function getSecrets() {
    const client = new SecretManagerServiceClient();
    const [clientId] = await client.accessSecretVersion({ name: `projects/${PROJECT_ID}/secrets/OAUTH_CLIENT_ID/versions/latest` });
    const [clientSecret] = await client.accessSecretVersion({ name: `projects/${PROJECT_ID}/secrets/OAUTH_CLIENT_SECRET/versions/latest` });
    const [refreshToken] = await client.accessSecretVersion({ name: `projects/${PROJECT_ID}/secrets/OAUTH_REFRESH_TOKEN/versions/latest` });
    return { clientId: clientId.payload.data.toString('utf8'), clientSecret: clientSecret.payload.data.toString('utf8'), refreshToken: refreshToken.payload.data.toString('utf8'), };
}

async function getAuthenticatedClient(secrets) {
  const auth = new google.auth.OAuth2(secrets.clientId, secrets.clientSecret, "https://developers.google.com/oauthplayground");
  auth.setCredentials({ refresh_token: secrets.refreshToken });
  return auth;
}


/**
 * JTSG Time Sheet: Receives files, uploads to Drive, and emails them.
 */
exports.processJtsgTsvs = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { files } = data;
    const userEmail = context.auth.token.email;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an array of files.');
    }

    try {
        const secrets = await getSecrets();
        const authClient = await getAuthenticatedClient(secrets);
        const drive = google.drive({ version: "v3", auth: authClient });
        const gmail = google.gmail({ version: 'v1', auth: authClient });

        const uploadPromises = files.map(async (file) => {
            const base64Data = file.data.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileMetadata = { name: file.name, parents: [JTSG_TSVS_DRIVE_FOLDER_ID] };
            const media = { mimeType: file.mimeType, body: require('stream').Readable.from(buffer) };
            await drive.files.create({ resource: fileMetadata, media: media, fields: 'id', supportsAllDrives: true });
            functions.logger.info(`Successfully uploaded file: ${file.name}`);
        });

        await Promise.all(uploadPromises);
        
        const attachments = files.map(file => ({ filename: file.name, content: file.data.split(',')[1], encoding: 'base64', mimeType: file.mimeType }));

        const mailOptions = { to: userEmail, subject: 'Your JTSG Time Sheet Submission', text: 'Hello,\n\nYour submitted time sheet(s) are attached for your records.\n\nThank you!', attachments: attachments };

        const boundary = "boundary_string_for_email";
        let mailParts = [
            `To: ${mailOptions.to}`,
            `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
            `--${boundary}`,
            'Content-Type: text/plain; charset="UTF-8"', '',
            mailOptions.text, ''
        ];

        mailOptions.attachments.forEach(att => {
            mailParts.push(`--${boundary}`);
            mailParts.push(`Content-Type: ${att.mimeType || 'application/octet-stream'}; name="${att.filename}"`);
            mailParts.push('Content-Transfer-Encoding: base64');
            mailParts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
            mailParts.push('');
            mailParts.push(att.content);
        });

        mailParts.push(`--${boundary}--`);
        
        const mail = mailParts.join('\n');
        const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });

        functions.logger.info(`Successfully processed and emailed ${files.length} time sheet(s) for ${userEmail}.`);
        return { success: true, message: 'Time sheet(s) submitted successfully!' };

    } catch (error) {
        functions.logger.error("Error in processJtsgTsvs:", error);
        throw new functions.https.HttpsError('internal', 'An error occurred while uploading the files.', error.message);
    }
});


/**
 * VPR: Receives data, writes to Sheet, triggers PDF generation.
 */
exports.processVprReport = functions.https.onCall(async (data, context) => {
    if (!context.auth) { throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.'); }
    const { reportData } = data; const userEmail = context.auth.token.email;
    try {
        const secrets = await getSecrets(); const authClient = await getAuthenticatedClient(secrets);
        try { const sheets = google.sheets({ version: "v4", auth: authClient }); const sheetRow = [ reportData.Date, reportData.ClientName, reportData.ServiceStage, reportData.EmploymentSpecialistName, reportData.Notes ]; await sheets.spreadsheets.values.append({ spreadsheetId: VPR_SHEET_ID, range: 'Sheet1!A:E', valueInputOption: 'USER_ENTERED', resource: { values: [sheetRow] } }); functions.logger.info(`Successfully appended data to Google Sheet for: ${reportData.ClientName}.`); } catch (sheetError) { functions.logger.error("ERROR STEP 1: FAILED TO APPEND TO GOOGLE SHEET.", sheetError); throw new functions.https.HttpsError('internal', 'Failed to write data to the Google Sheet. Check permissions and ensure the Sheets API is enabled.', sheetError.message); }
        try { await generateVprPdf(authClient, { reportData, userEmail }); functions.logger.info(`Successfully generated and emailed PDF for: ${reportData.ClientName}.`); } catch (pdfError) { functions.logger.error("ERROR STEP 2: FAILED TO GENERATE PDF.", pdfError); throw new functions.https.HttpsError('internal', 'Failed to generate the PDF report. Check Doc template and Drive folder permissions.', pdfError.message); }
        return { success: true, message: `Report for ${reportData.ClientName} submitted successfully!` };
    } catch (error) { functions.logger.error("Unhandled error in processVprReport:", error); if (error instanceof functions.https.HttpsError) { throw error; } else { throw new functions.https.HttpsError('internal', 'An unexpected error occurred.', error.message); } }
});

async function generateVprPdf(authClient, jobData) {
    const drive = google.drive({ version: "v3", auth: authClient }); const docs = google.docs({ version: "v1", auth: authClient }); const gmail = google.gmail({ version: 'v1', auth: authClient });
    const { reportData, userEmail } = jobData; const serviceStage = reportData.ServiceStage; const destinationFolderId = VPR_FOLDER_MAP[serviceStage] || VPR_DRIVE_FOLDER_ID_DEFAULT; functions.logger.info(`Service Stage: "${serviceStage}", selected destination folder ID: "${destinationFolderId}"`);
    const fileName = `${reportData.ClientName || 'Client'} - ${reportData.EmploymentSpecialistName || 'Specialist'} - ${reportData.Date} Report.pdf`;
    const copyRequest = { name: `[TEMP] ${fileName}`, parents: [destinationFolderId] }; const copiedFile = await drive.files.copy({ fileId: VPR_TEMPLATE_ID, resource: copyRequest }); const tempDocId = copiedFile.data.id;
    try {
        const requests = Object.entries(reportData).map(([key, value]) => ({ replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: false }, replaceText: String(value || '') } })); await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests } });
        const pdfResponse = await drive.files.export({ fileId: tempDocId, mimeType: "application/pdf" }, { responseType: "arraybuffer" }); const pdfBytes = Buffer.from(pdfResponse.data);
        const fileMetadata = { name: fileName, parents: [destinationFolderId] }; const media = { mimeType: 'application/pdf', body: require('stream').Readable.from(pdfBytes) }; await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' });
        const mailOptions = { to: userEmail, subject: `Completed Vocational Progress Report for ${reportData.ClientName}`, text: `Hello,\n\nYour completed Vocational Progress Report for ${reportData.ClientName} is attached.\n\nThank you!`, attachments: [{ filename: fileName, content: pdfBytes.toString('base64'), encoding: 'base64' }] };
        const boundary = "boundary_string_for_email"; const mailParts = [ `To: ${mailOptions.to}`, `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', mailOptions.text, '', `--${boundary}`, `Content-Type: application/pdf; name="${fileName}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${fileName}"`, '', mailOptions.attachments[0].content, `--${boundary}--` ]; const mail = mailParts.join('\n'); const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });
    } finally { await drive.files.delete({ fileId: tempDocId }); }
}

/**
 * Main Firestore-triggered function for form-based reports
 */
exports.generateReport = functions.region('us-east1').firestore.document('report_jobs/{jobId}').onCreate(async (snap, context) => {
    const jobData = snap.data(); try { const secrets = await getSecrets(); const authClient = await getAuthenticatedClient(secrets); if (jobData.reportType === 'jtsgvmr') { const { reportData, typedEsName, signatureData, userEmail } = jobData; const parsedData = JSON.parse(reportData); const pdfBytes = await generateJtsgVmrPdf(authClient, parsedData, typedEsName, signatureData); await saveAndEmailJtsgVmrPdf(authClient, pdfBytes, parsedData, userEmail); functions.logger.info(`Successfully processed JTSG VMR for: ${parsedData.ClientName}`); } else if (jobData.reportType === 'evf') { const { reportData, userEmail } = jobData; const parsedData = JSON.parse(reportData); const pdfBytes = await generateEvfPdf(authClient, parsedData); await saveAndEmailEvfPdf(authClient, pdfBytes, parsedData, userEmail); functions.logger.info(`Successfully processed EVF for: ${parsedData.Name}`); } else { const { reportData, typedEsName, signatureData, userEmail } = jobData; const parsedData = JSON.parse(reportData); const pdfBytes = await generatePdf(authClient, parsedData, typedEsName, signatureData); await saveAndEmailPdf(authClient, pdfBytes, parsedData, userEmail); functions.logger.info(`Successfully processed SE Monthly Report for: ${parsedData.jobSeekerName}`); } return snap.ref.set({ status: 'complete' }, { merge: true }); } catch (error) { functions.logger.error("Caught an error in generateReport:", error); return snap.ref.set({ status: 'error', errorMessage: error.message }, { merge: true }); }
});

/**
 * Scheduled function to clear the VPR sheet weekly
 */
exports.clearVprSheet = functions.pubsub.schedule('0 0 * * 0').timeZone('America/New_York').onRun(async (context) => { try { functions.logger.info('Running weekly VPR sheet clearing job.'); const secrets = await getSecrets(); const authClient = await getAuthenticatedClient(secrets); const sheets = google.sheets({ version: "v4", auth: authClient }); await sheets.spreadsheets.values.clear({ spreadsheetId: VPR_SHEET_ID, range: 'Sheet1!A2:E' }); functions.logger.info('Successfully cleared the VPR Google Sheet.'); return null; } catch (error) { functions.logger.error('Error clearing VPR Google Sheet:', error); return null; } });

/**
 * Scheduled function to check for overdue reports monthly
 */
exports.checkOverdueReports = functions.region('us-east1').pubsub.schedule('0 8 5 * *').timeZone('America/New_York').onRun(async (context) => { functions.logger.info('Running overdue report check...'); const db = admin.firestore(); const secrets = await getSecrets(); const authClient = await getAuthenticatedClient(secrets); const overdueClients = []; const cutoffDate = new Date(); cutoffDate.setDate(cutoffDate.getDate() - 15); const reportsRef = db.collection('monthly_se_reports'); const snapshot = await reportsRef.get(); if (snapshot.empty) { functions.logger.info('No reports found in the database.'); return null; } snapshot.forEach(doc => { const report = doc.data(); const lastSubmitted = new Date(report.lastSubmitted); if (lastSubmitted < cutoffDate) { overdueClients.push({ clientName: report.jobSeekerName || 'Unknown Client', specialistName: report.seSpecialistName || 'Unknown Specialist' }); } }); if (overdueClients.length > 0) { functions.logger.info(`Found ${overdueClients.length} overdue reports. Sending email notification.`); const emailBody = 'The following SE Monthly Reports are overdue (not submitted in the last 15 days):\n\n' + overdueClients.map(c => ` - Client: ${c.clientName}, Specialist: ${c.specialistName}`).join('\n'); const gmail = google.gmail({ version: 'v1', auth: authClient }); const mailOptions = { to: 'bryan.evans@thejoshuatree.org, debbie.evans@thejoshuatree.org', subject: 'Overdue SE Monthly Reports Notification', text: emailBody }; const boundary = "boundary_string_for_email"; const mail = [ `To: ${mailOptions.to}`, `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', mailOptions.text, '', `--${boundary}--` ].join('\n'); const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); } else { functions.logger.info('No overdue reports found.'); } return null; });


// --- HELPER FUNCTIONS for PDF Generation ---

const findPlaceholderIndex = (elements, text) => { if (!elements) return -1; for (const el of elements) { if (el.paragraph) { for (const run of el.paragraph.elements) { if (run.textRun?.content?.includes(text)) return run.startIndex + run.textRun.content.indexOf(text); } } else if (el.table) { for (const row of el.table.tableRows) { for (const cell of row.tableCells) { const index = findPlaceholderIndex(cell.content, text); if (index !== -1) return index; } } } } return -1; };

async function uploadSignatureToDrive(drive, signatureData) { if (!signatureData || !signatureData.startsWith('data:image/png;base64,')) { throw new Error('Invalid signature data format.'); } const base64EncodedImageString = signatureData.replace(/^data:image\/\w+;base64,/, ''); const imageBuffer = Buffer.from(base64EncodedImageString, 'base64'); const fileMetadata = { name: `temp_signature_${Date.now()}.png`, parents: [SIGNATURE_REPO_ID], mimeType: 'image/png' }; const media = { mimeType: 'image/png', body: require('stream').Readable.from(imageBuffer) }; const file = await drive.files.create({ resource: fileMetadata, media: media, fields: 'id, webContentLink' }); await drive.permissions.create({ fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' } }); await new Promise(resolve => setTimeout(resolve, 3000)); return { fileId: file.data.id, url: file.data.webContentLink }; }

async function generateJtsgVmrPdf(authClient, parsedData, typedEsName, signatureData) { const drive = google.drive({ version: "v3", auth: authClient }); const docs = google.docs({ version: "v1", auth: authClient }); const copyRequest = { name: `[TEMP] JTSG VMR - ${parsedData.ClientName || 'Report'}` }; const copiedFile = await drive.files.copy({ fileId: JTSG_VMR_TEMPLATE_ID, resource: copyRequest }); const tempDocId = copiedFile.data.id; let tempSignatureFile = null; try { const requests = []; for (const key in parsedData) { requests.push({ replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: true }, replaceText: parsedData[key] || '' } }); } requests.push({ replaceAllText: { containsText: { text: '{{ESName}}', matchCase: true }, replaceText: typedEsName || '' } }); if (requests.length > 0) { await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests } }); } if (signatureData) { tempSignatureFile = await uploadSignatureToDrive(drive, signatureData); const uniquePlaceholder = `__SIGNATURE_${Date.now()}__`; await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: [{ replaceAllText: { containsText: { text: '{{ProviderSignature}}', matchCase: true }, replaceText: uniquePlaceholder } }] } }); const updatedDoc = await docs.documents.get({ documentId: tempDocId }); const signatureIndex = findPlaceholderIndex(updatedDoc.data.body.content, uniquePlaceholder); if (signatureIndex !== -1) { const imageUpdateRequests = [ { deleteContentRange: { range: { startIndex: signatureIndex, endIndex: signatureIndex + uniquePlaceholder.length } } }, { insertInlineImage: { location: { index: signatureIndex }, uri: tempSignatureFile.url, objectSize: { height: { magnitude: 75, unit: 'PT' }, width: { magnitude: 150, unit: 'PT' } } } }, ]; await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: imageUpdateRequests } }); } } else { await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: [{ replaceAllText: { containsText: { text: '{{ProviderSignature}}', matchCase: true }, replaceText: 'Not Signed' } }] }}); } const pdfResponse = await drive.files.export({ fileId: tempDocId, mimeType: "application/pdf" }, { responseType: "arraybuffer" }); return Buffer.from(pdfResponse.data); } finally { await drive.files.delete({ fileId: tempDocId }); if(tempSignatureFile){ try { await drive.files.delete({ fileId: tempSignatureFile.fileId }); } catch (e) { functions.logger.error("Failed to delete temporary signature from Drive:", e); } } } }

async function saveAndEmailJtsgVmrPdf(authClient, pdfBytes, parsedData, userEmail) { const drive = google.drive({ version: 'v3', auth: authClient }); const gmail = google.gmail({ version: 'v1', auth: authClient }); const fileName = `JTSG VMR - ${parsedData.ClientName || 'Client'} - ${parsedData.Month}.pdf`; const fileMetadata = { name: fileName, parents: [JTSG_VMR_DRIVE_FOLDER_ID] }; const media = { mimeType: 'application/pdf', body: require('stream').Readable.from(pdfBytes) }; await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' }); const mailOptions = { to: userEmail, subject: `Completed JTSG Vocational Monthly Report for ${parsedData.ClientName}`, text: `Hello ${parsedData.ESName},\n\nYour completed JTSG Vocational Monthly Report for ${parsedData.ClientName} is attached.\n\nThank you!`, attachments: [{ filename: fileName, content: Buffer.from(pdfBytes).toString('base64'), encoding: 'base64' }] }; const boundary = "boundary_string_for_email"; const mailParts = [ `To: ${mailOptions.to}`, `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', mailOptions.text, '', `--${boundary}`, `Content-Type: application/pdf; name="${fileName}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${fileName}"`, '', mailOptions.attachments[0].content, `--${boundary}--` ]; const mail = mailParts.join('\n'); const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); }

async function generateEvfPdf(authClient, parsedData) { const drive = google.drive({ version: "v3", auth: authClient }); const docs = google.docs({ version: "v1", auth: authClient }); const copyRequest = { name: `[TEMP] EVF - ${parsedData.Name || 'Report'}` }; const copiedFile = await drive.files.copy({ fileId: EVF_TEMPLATE_ID, resource: copyRequest }); const tempDocId = copiedFile.data.id; try { const requests = []; for (const key in parsedData) { requests.push({ replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: false }, replaceText: parsedData[key] || '' } }); } if (requests.length > 0) { await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests } }); } const pdfResponse = await drive.files.export({ fileId: tempDocId, mimeType: "application/pdf" }, { responseType: "arraybuffer" }); return Buffer.from(pdfResponse.data); } finally { await drive.files.delete({ fileId: tempDocId }); } }

async function saveAndEmailEvfPdf(authClient, pdfBytes, parsedData, userEmail) { const drive = google.drive({ version: 'v3', auth: authClient }); const gmail = google.gmail({ version: 'v1', auth: authClient }); const fileName = `EVF - ${parsedData.Name || 'Client'} - ${parsedData.Date}.pdf`; const fileMetadata = { name: fileName, parents: [EVF_DRIVE_FOLDER_ID] }; const media = { mimeType: 'application/pdf', body: require('stream').Readable.from(pdfBytes) }; await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' }); const mailOptions = { to: userEmail, subject: `Completed Employment Verification Form for ${parsedData.Name}`, text: `Hello,\n\nYour completed Employment Verification Form for ${parsedData.Name} is attached.\n\nThank you!`, attachments: [{ filename: fileName, content: Buffer.from(pdfBytes).toString('base64'), encoding: 'base64' }] }; const boundary = "boundary_string_for_email"; const mailParts = [ `To: ${mailOptions.to}`, `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', mailOptions.text, '', `--${boundary}`, `Content-Type: application/pdf; name="${fileName}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${fileName}"`, '', mailOptions.attachments[0].content, `--${boundary}--` ]; const mail = mailParts.join('\n'); const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); }

async function generatePdf(authClient, parsedData, typedEsName, signatureData) { const drive = google.drive({ version: "v3", auth: authClient }); const docs = google.docs({ version: "v1", auth: authClient }); const copyRequest = { name: `[TEMP] ${parsedData.jobSeekerName || 'Report'}` }; const copiedFile = await drive.files.copy({ fileId: DOC_TEMPLATE_ID, resource: copyRequest }); const tempDocId = copiedFile.data.id; let tempSignatureFile = null; try { const textReplacementRequests = []; for (const key in parsedData) { textReplacementRequests.push({ replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: true }, replaceText: Array.isArray(parsedData[key]) ? parsedData[key].join(', ') : (parsedData[key] || '') } }); } textReplacementRequests.push({ replaceAllText: { containsText: { text: '{{typedEsName}}', matchCase: true }, replaceText: typedEsName || '' } }); textReplacementRequests.push({ replaceAllText: { containsText: { text: '{{submissionDate}}', matchCase: true }, replaceText: new Date().toLocaleDateString() } }); if (textReplacementRequests.length > 0) { await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: textReplacementRequests } }); } if (signatureData) { tempSignatureFile = await uploadSignatureToDrive(drive, signatureData); const uniquePlaceholder = `__SIGNATURE_${Date.now()}__`; await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: [{ replaceAllText: { containsText: { text: '{{esSignature}}', matchCase: true }, replaceText: uniquePlaceholder } }] } }); const updatedDoc = await docs.documents.get({ documentId: tempDocId }); let signatureIndex = -1; signatureIndex = findPlaceholderIndex(updatedDoc.data.body.content, uniquePlaceholder); if (signatureIndex !== -1) { const imageUpdateRequests = [ { deleteContentRange: { range: { startIndex: signatureIndex, endIndex: signatureIndex + uniquePlaceholder.length } } }, { insertInlineImage: { location: { index: signatureIndex }, uri: tempSignatureFile.url, objectSize: { height: { magnitude: 75, unit: 'PT' }, width: { magnitude: 150, unit: 'PT' } } } }, ]; await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: imageUpdateRequests } }); } } else { await docs.documents.batchUpdate({ documentId: tempDocId, resource: { requests: [{ replaceAllText: { containsText: { text: '{{esSignature}}', matchCase: true }, replaceText: 'Not Signed' } }] }}); } const pdfResponse = await drive.files.export({ fileId: tempDocId, mimeType: "application/pdf" }, { responseType: "arraybuffer" }); return Buffer.from(pdfResponse.data); } finally { await drive.files.delete({ fileId: tempDocId }); if(tempSignatureFile){ try { await drive.files.delete({ fileId: tempSignatureFile.fileId }); } catch (e) { functions.logger.error("Failed to delete temporary signature from Drive:", e); } } } }

async function saveAndEmailPdf(authClient, pdfBytes, parsedData, userEmail) { const drive = google.drive({ version: 'v3', auth: authClient }); const gmail = google.gmail({ version: 'v1', auth: authClient }); const fileName = `${parsedData.jobSeekerName || 'Unknown Client'} - ${parsedData.month || 'Date'} - SE Monthly Report.pdf`; const fileMetadata = { name: fileName, parents: [DRIVE_FOLDER_ID] }; const media = { mimeType: 'application/pdf', body: require('stream').Readable.from(pdfBytes) }; await drive.files.create({ resource: fileMetadata, media: media, fields: 'id' }); const mailOptions = { to: userEmail, subject: `Completed SE Monthly Report for ${parsedData.jobSeekerName}`, text: `Hello ${parsedData.seSpecialistName},\n\nYour completed report for ${parsedData.jobSeekerName} is attached.\n\nThank you!`, attachments: [{ filename: fileName, content: Buffer.from(pdfBytes).toString('base64'), encoding: 'base64' }] }; const boundary = "boundary_string_for_email"; const mailParts = [ `To: ${mailOptions.to}`, `Subject: =?utf-8?B?${Buffer.from(mailOptions.subject).toString('base64')}?=`, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', mailOptions.text, '', `--${boundary}`, `Content-Type: application/pdf; name="${fileName}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${fileName}"`, '', mailOptions.attachments[0].content, `--${boundary}--` ]; const mail = mailParts.join('\n'); const rawMessage = Buffer.from(mail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); }

