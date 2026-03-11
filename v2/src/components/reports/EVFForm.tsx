'use client';

import { useRef, useState } from 'react';

interface Props {
  user: { email: string; displayName: string };
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function EVFForm({ user, onSuccess, onError }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    const formData = new FormData(formRef.current);
    const evfData = Object.fromEntries(formData.entries());
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports/evf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: evfData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      onSuccess(data.message || 'Form submitted! You will receive an email with the final PDF shortly.');
    } catch (err) {
      onError(`An error occurred: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">
          Employment Verification Form
        </h1>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Date</label>
              <input type="date" name="Date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Client Name</label>
              <input type="text" name="Name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Company Name</label>
              <input type="text" name="CompanyName" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Company Telephone</label>
              <input type="tel" name="CompanyTelephone" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Company Address</label>
            <input type="text" name="CompanyAddress" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Supervisor Name</label>
              <input type="text" name="SupervisorName" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">VR Counselor Name</label>
              <input type="text" name="VRCounselorName" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Job Title</label>
              <input type="text" name="JobTitle" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Salary</label>
              <input type="text" name="Salary" placeholder="e.g., $15/hour" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Date of Hire</label>
              <input type="date" name="DateofHire" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Start Date</label>
              <input type="date" name="StartDate" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Job Description</label>
            <textarea name="JobDescription" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Hours per week</label>
            <input type="number" name="Hoursperweek" className="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Benefits (if available)</label>
            <input type="text" name="Benefits" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Currently employed?</h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input type="radio" name="Currentlyemployed" value="Yes" className="form-radio text-green-600" required />
                <span className="ml-2">Yes</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="Currentlyemployed" value="No" className="form-radio text-green-600" />
                <span className="ml-2">No</span>
              </label>
            </div>
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
              'Submit Form'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
