'use client';

import { useState, useEffect, useRef } from 'react';

const RECALL_EXCLUDE = ['jobDevelopment', 'month', 'dateRangeCovers', 'dateReportSubmitted'];

interface Props {
  clientName: string;
  esName: string;
  initialData: Record<string, unknown>;
  onReview: (data: Record<string, unknown>) => void;
}

export function SEMonthlyForm({ clientName, esName, initialData, onReview }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({
    ...initialData,
    jobSeekerName: clientName,
    seSpecialistName: esName,
    seProviderName: 'Joshua Tree Service Group',
  });
  const [loading, setLoading] = useState(true);
  const [recallMessage, setRecallMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function loadRecall() {
      if (!clientName) {
        setLoading(false);
        return;
      }
      try {
        const clientId = clientName.toLowerCase().replace(/\s/g, '');
        const res = await fetch(`/api/reports/recall?clientId=${encodeURIComponent(clientId)}`);
        if (res.ok) {
          const recalled = await res.json();
          if (recalled && Object.keys(recalled).length > 0) {
            const merged = { ...recalled };
            RECALL_EXCLUDE.forEach((k) => delete merged[k]);
            setData((prev) => ({ ...merged, ...prev }));
            setRecallMessage('Previous report data loaded.');
          } else {
            setRecallMessage('No previous report found for this client.');
          }
        }
      } catch {
        setRecallMessage('Could not load previous data.');
      } finally {
        setLoading(false);
      }
    }
    loadRecall();
  }, [clientName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const obj: Record<string, unknown> = {};
    const modelValues: string[] = [];
    formData.forEach((value, key) => {
      if (key === 'model') {
        modelValues.push(value as string);
      } else {
        obj[key] = value;
      }
    });
    if (modelValues.length) obj.model = modelValues.join(', ');
    onReview(obj);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">SE Monthly Reports</h1>
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-gray-700 italic">
            <strong>Instructions:</strong> This report must be completed in its entirety...
          </p>
        </div>
        {recallMessage && (
          <p className="text-sm text-green-600 mb-4">{recallMessage}</p>
        )}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Identified Supported Employment Model</h3>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {['Traditional', 'IPS', 'Customized Supported Employment'].map((m) => (
                <label key={m} className="flex items-center">
                  <input
                    type="checkbox"
                    name="model"
                    value={m}
                    className="form-checkbox text-green-600 rounded-md"
                  />
                  <span className="ml-2">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Month</label>
            <input
              type="month"
              name="month"
              defaultValue={(data.month as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Date Report Submitted</label>
            <input
              type="date"
              name="dateReportSubmitted"
              defaultValue={(data.dateReportSubmitted as string) || new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Job Seeker&apos;s Name</label>
            <input
              type="text"
              name="jobSeekerName"
              value={clientName}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Counselor&apos;s Name</label>
            <input
              type="text"
              name="counselorName"
              placeholder="Full name of the GVRA counselor"
              defaultValue={(data.counselorName as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">SE Employment Specialist Name</label>
            <input
              type="text"
              name="seSpecialistName"
              value={esName}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">SE Provider Name</label>
            <input
              type="text"
              name="seProviderName"
              value="Joshua Tree Service Group"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Job Seeker&apos;s Employment Goal</label>
            <input
              type="text"
              name="employmentGoal"
              placeholder="The client's stated goal for employment"
              defaultValue={(data.employmentGoal as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Date Range Report Covers</label>
            <input
              type="text"
              name="dateRangeCovers"
              placeholder="e.g., 10/01/2025 - 10/31/2025"
              defaultValue={(data.dateRangeCovers as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Hours of Job Coaching</label>
            <input
              type="text"
              name="hoursOfCoaching"
              placeholder="e.g., 15.5"
              defaultValue={(data.hoursOfCoaching as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {[
            { key: 'medicalConsiderations', label: 'Medical Considerations', hint: 'Describe any accommodations...' },
            { key: 'behavioralHealthConsiderations', label: 'Behavioral Health Considerations', hint: 'Describe any accommodations...' },
            { key: 'sensory', label: 'Sensory', hint: "Describe how the job seeker's needs are being addressed..." },
            { key: 'assistiveTechnology', label: 'Assistive Technology/Accommodations...', hint: 'Describe the use of AWT...' },
            { key: 'releaseOfInformation', label: 'Release of Information/Self-Advocacy', hint: 'Describe how disclosure has been addressed...' },
            { key: 'jobDevelopment', label: 'Job Development', hint: 'Describe progress and activities...' },
            { key: 'ongoingSupports', label: 'On-going Supports & follow-up', hint: 'Indicate what ongoing supports are being provided...' },
            { key: 'potentialBarriers', label: 'Potential Barriers', hint: 'Describe any new or ongoing potential barriers...' },
            { key: 'extendedServices', label: 'Extended Services', hint: 'Describe how extended services will be provided...' },
          ].map(({ key, label, hint }) => (
            <div key={key} className="mb-6">
              <label className="block text-gray-700 font-semibold mb-1">{label}</label>
              <p className="text-xs text-gray-500 mb-2 italic">{hint}</p>
              <textarea
                name={key}
                rows={4}
                defaultValue={(data[key] as string) || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full mt-6 py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
          >
            Review & Sign
          </button>
        </form>
      </div>
    </div>
  );
}
