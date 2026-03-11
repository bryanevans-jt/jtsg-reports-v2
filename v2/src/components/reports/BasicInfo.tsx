'use client';

import { useState } from 'react';

interface Props {
  esName: string;
  clientName: string;
  reportType: string;
  onContinue: (esName: string, clientName: string) => void;
}

export function BasicInfo({ esName, clientName, reportType, onContinue }: Props) {
  const [es, setEs] = useState(esName);
  const [client, setClient] = useState(clientName);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg mt-10">
        <h1 className="text-2xl font-bold mb-4 text-center text-green-800">
          Client Information
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Please enter the client&apos;s information to continue.
        </p>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Employment Specialist Name"
            value={es}
            onChange={(e) => setEs(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            readOnly
          />
          <input
            type="text"
            placeholder="Client Name"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <button
          onClick={() => onContinue(es, client)}
          className="w-full mt-6 py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
