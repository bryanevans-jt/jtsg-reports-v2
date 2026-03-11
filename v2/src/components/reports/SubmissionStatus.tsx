'use client';

import Link from 'next/link';

interface Props {
  message: string;
  onHome: () => void;
  onSubmitAnother?: () => void;
}

export function SubmissionStatus({ message, onHome, onSubmitAnother }: Props) {
  const isSuccess = message.toLowerCase().includes('success') || message.includes('submitted');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-4 text-green-800">Submission Status</h1>
        <p
          className={`text-lg font-semibold mb-6 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
        >
          {message}
        </p>
        <div className="flex flex-col gap-3">
          {onSubmitAnother && (
            <button
              type="button"
              onClick={onSubmitAnother}
              className="w-full py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
            >
              Submit another report
            </button>
          )}
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition duration-300 text-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
