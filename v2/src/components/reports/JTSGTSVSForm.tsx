'use client';

import { useRef, useState, useEffect } from 'react';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx';

interface Props {
  user: { email: string; displayName: string };
  esName: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function JTSGTSVSForm({ user, esName, onSuccess, onError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clientName, setClientName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports/jtsg-tsvs')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data?.templateUrl && setTemplateUrl(data.templateUrl))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
    if (!ext || !validExts.includes(ext)) {
      onError('Please select a PDF, Word document, or Excel spreadsheet.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!clientName.trim()) {
      onError('Please enter the client name.');
      return;
    }
    if (!selectedFile) {
      onError('Please attach a document (PDF, Word, or Excel).');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('employmentSpecialistName', esName || user.displayName);
      formData.append('clientName', clientName.trim());
      formData.append('file', selectedFile);

      const res = await fetch('/api/reports/jtsg-tsvs', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      onSuccess(data.message || 'Time sheet submitted successfully! You will receive a confirmation email with your document attached.');
    } catch (err) {
      onError(`An error occurred: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl mt-10">
        <h1 className="text-3xl font-bold mb-2 text-center text-green-800">
          JTSG Time Sheet for Vocational Services
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Submit your JTSG Time Sheet for Vocational Services below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Employment Specialist Name</label>
            <input
              type="text"
              value={esName || user.displayName}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Attach Document</label>
            <p className="text-sm text-gray-500 mb-2">
              PDF, Word documents, or Excel spreadsheets. One file per submission.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
          {templateUrl && (
            <div>
              <a
                href={templateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download template form
              </a>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
