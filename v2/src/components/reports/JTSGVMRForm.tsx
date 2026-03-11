'use client';

import { useRef } from 'react';

interface Props {
  initialData: Record<string, unknown>;
  onReview: (data: Record<string, unknown>) => void;
}

export function JTSGVMRForm({ initialData, onReview }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const obj: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      obj[key] = value;
    });
    onReview(obj);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">
          JTSG Vocational Monthly Report
        </h1>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Month of Service</label>
            <input
              type="month"
              name="MonthofService"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Service Provided</label>
            <input
              type="text"
              name="ServiceProvided"
              placeholder="e.g., Job Coaching"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Client Name</label>
            <input
              type="text"
              name="ClientName"
              value={(initialData.ClientName as string) || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Employment Specialist Name</label>
            <input
              type="text"
              name="EmploymentSpecialistName"
              value={(initialData.ESName as string) || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">VR Counselor</label>
            <input
              type="text"
              name="VRCounselor"
              placeholder="Counselor's full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Summary Description of Services Rendered</label>
            <textarea
              name="SummaryDescriptionofServicesRendered"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Participant Response</label>
            <textarea
              name="ParticipantResponse"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Areas of Concern</label>
            <textarea
              name="AreasofConcern"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Next Steps</label>
            <textarea
              name="NextSteps"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Date</label>
            <input
              type="date"
              name="Date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
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
