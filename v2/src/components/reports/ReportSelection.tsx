'use client';

import { useState } from 'react';
import { SignOutButton } from '@/components/SignOutButton';

type ReportType = 'seMonthly' | 'vpr' | 'jtsgvmr' | 'evf' | 'jtsgtsvs';

interface Props {
  user: { email: string; displayName: string };
  onSelect: (type: ReportType) => void;
}

export function ReportSelection({ user, onSelect }: Props) {
  const [reportType, setReportType] = useState<ReportType | ''>('');

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">
          Joshua Tree Reports
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Welcome, {user.displayName}! Use this tool to submit client reports.
        </p>
        <div className="flex flex-col mb-4">
          <label htmlFor="reportType" className="text-gray-700 font-semibold mb-2">
            Report Type
          </label>
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType | '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select a report...</option>
            <option value="seMonthly">SE Monthly Reports</option>
            <option value="vpr">Vocational Progress Reports</option>
            <option value="jtsgvmr">JTSG Vocational Monthly Reports</option>
            <option value="jtsgtsvs">JTSG Time Sheet for Vocational Services</option>
            <option value="evf">Employment Verification Form</option>
          </select>
        </div>
        <button
          onClick={() => reportType && onSelect(reportType)}
          disabled={!reportType}
          className="w-full py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
