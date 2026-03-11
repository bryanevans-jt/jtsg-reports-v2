'use client';

import { useRef, useEffect, useState } from 'react';

const SE_MONTHLY_ORDERED_KEYS = [
  'month',
  'dateReportSubmitted',
  'jobSeekerName',
  'counselorName',
  'seSpecialistName',
  'seProviderName',
  'employmentGoal',
  'dateRangeCovers',
  'hoursOfCoaching',
  'model',
  'medicalConsiderations',
  'behavioralHealthConsiderations',
  'sensory',
  'assistiveTechnology',
  'releaseOfInformation',
  'jobDevelopment',
  'ongoingSupports',
  'potentialBarriers',
  'extendedServices',
];

const SE_MONTHLY_LABELS: Record<string, string> = {
  month: 'Month',
  dateReportSubmitted: 'Date Submitted',
  jobSeekerName: "Job Seeker's Name",
  counselorName: "Counselor's Name",
  seSpecialistName: 'ES Name',
  seProviderName: 'Provider Name',
  employmentGoal: 'Employment Goal',
  dateRangeCovers: 'Date Range',
  hoursOfCoaching: 'Hours of Coaching',
  model: 'SE Model',
  medicalConsiderations: 'Medical Considerations',
  behavioralHealthConsiderations: 'Behavioral Health',
  sensory: 'Sensory',
  assistiveTechnology: 'Assistive Tech',
  releaseOfInformation: 'ROI/Advocacy',
  jobDevelopment: 'Job Development',
  ongoingSupports: 'Ongoing Supports',
  potentialBarriers: 'Potential Barriers',
  extendedServices: 'Extended Services',
};

const JTSG_VMR_ORDERED_KEYS = [
  'MonthofService',
  'ServiceProvided',
  'ClientName',
  'EmploymentSpecialistName',
  'VRCounselor',
  'SummaryDescriptionofServicesRendered',
  'ParticipantResponse',
  'AreasofConcern',
  'NextSteps',
  'Date',
];

const JTSG_VMR_LABELS: Record<string, string> = {
  MonthofService: 'Month of Service',
  ServiceProvided: 'Service Provided',
  ClientName: 'Client Name',
  EmploymentSpecialistName: 'Employment Specialist',
  VRCounselor: 'VR Counselor',
  SummaryDescriptionofServicesRendered: 'Summary of Services Rendered',
  ParticipantResponse: 'Participant Response',
  AreasofConcern: 'Areas of Concern',
  NextSteps: 'Next Steps',
  Date: 'Date',
};

interface Props {
  reportData: Record<string, unknown>;
  typedEsName: string;
  signatureData: string;
  onSignatureChange: (data: string) => void;
  onTypedNameChange?: (name: string) => void;
  onSubmit: (capturedSignature: string, typedNameValue: string) => void | Promise<void>;
  onBack: () => void;
  variant?: 'seMonthly' | 'jtsgvmr';
}

export function ReviewAndSign({
  reportData,
  typedEsName,
  signatureData,
  onSignatureChange,
  onTypedNameChange,
  onSubmit,
  onBack,
  variant = 'seMonthly',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typedName, setTypedName] = useState(typedEsName);

  const orderedKeys = variant === 'jtsgvmr' ? JTSG_VMR_ORDERED_KEYS : SE_MONTHLY_ORDERED_KEYS;
  const fieldLabels = variant === 'jtsgvmr' ? JTSG_VMR_LABELS : SE_MONTHLY_LABELS;

  const summaryHtml = orderedKeys
    .map((key) => {
      const value = reportData[key];
      if (!value) return '';
      const label = fieldLabels[key] || key;
      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
      return (
        <div key={key} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="font-semibold text-gray-800">{label}</dt>
          <dd className="text-gray-600">{displayValue}</dd>
        </div>
      );
    })
    .filter(Boolean);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      onSignatureChange('');
    }
  };

  const captureSignature = (): string => {
    const canvas = canvasRef.current;
    const dataUrl = canvas?.toDataURL('image/png') || '';
    if (dataUrl) onSignatureChange(dataUrl);
    return dataUrl;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let drawing = false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const end = () => {
      drawing = false;
      ctx.closePath();
      captureSignature();
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start as EventListener, { passive: false });
    canvas.addEventListener('touchmove', draw as EventListener, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start as EventListener);
      canvas.removeEventListener('touchmove', draw as EventListener);
      canvas.removeEventListener('touchend', end);
    };
  }, []);

  const handleSubmit = () => {
    const captured = captureSignature();
    setTimeout(() => onSubmit(captured, typedName), 100);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold mb-4 text-center text-green-800">
          Final Review and Signature
        </h1>
        <div className="w-full bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Report Summary</h2>
          <dl className="space-y-2">{summaryHtml}</dl>
        </div>
        {variant === 'seMonthly' && (
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-2">ES Certification</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>By signing below, I, the Employment Specialist, certify that:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>The above dates, time, and services are accurate;</li>
                <li>I personally provided services recorded on this form...</li>
                <li>I documented the information on the form...</li>
                <li>I signed the report below; and</li>
                <li>I maintain all staff qualifications...</li>
              </ul>
            </div>
          </div>
        )}
        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              {variant === 'jtsgvmr' ? 'ES Typed Name' : 'ES Typed Name'}
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                onTypedNameChange?.(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              {variant === 'jtsgvmr' ? 'Provider Signature' : 'ES Signature'}
            </label>
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="border border-gray-300 rounded-lg w-full max-w-full touch-none"
            />
            <button
              type="button"
              onClick={clearSignature}
              className="text-sm text-gray-500 hover:text-red-500 mt-2"
            >
              Clear Signature
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="w-1/2 py-3 px-4 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-1/2 py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
