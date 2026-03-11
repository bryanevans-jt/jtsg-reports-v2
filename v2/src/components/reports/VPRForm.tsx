'use client';

import { useRef, useState } from 'react';
import { ALL_VPR_SERVICE_STAGES } from '@/lib/constants';

interface Props {
  user: { email: string; displayName: string };
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function VPRForm({ user, onSuccess, onError }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    const formData = new FormData(formRef.current);
    const vprData = Object.fromEntries(formData.entries());
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports/vpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: vprData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      onSuccess(data.message || 'Report submitted successfully!');
    } catch (err) {
      onError(`An error occurred: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl mt-10">
        <h1 className="text-3xl font-bold mb-6 text-center text-green-800">
          Vocational Progress Report
        </h1>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Date</label>
            <input
              type="date"
              name="Date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Client Name</label>
            <input
              type="text"
              name="ClientName"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Service Stage</label>
            <select
              name="ServiceStage"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select a stage...</option>
              {ALL_VPR_SERVICE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Employment Specialist Name</label>
            <input
              type="text"
              name="EmploymentSpecialistName"
              value={user.displayName}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Notes</label>
            <textarea
              name="Notes"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter progress notes here..."
              required
            />
          </div>
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
              'Submit Report'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
