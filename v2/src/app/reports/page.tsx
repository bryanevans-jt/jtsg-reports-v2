'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReportSelection } from '@/components/reports/ReportSelection';
import { BasicInfo } from '@/components/reports/BasicInfo';
import { SEMonthlyForm } from '@/components/reports/SEMonthlyForm';
import { VPRForm } from '@/components/reports/VPRForm';
import { JTSGVMRForm } from '@/components/reports/JTSGVMRForm';
import { EVFForm } from '@/components/reports/EVFForm';
import { JTSGTSVSForm } from '@/components/reports/JTSGTSVSForm';
import { ReviewAndSign } from '@/components/reports/ReviewAndSign';
import { SubmissionStatus } from '@/components/reports/SubmissionStatus';

type Screen =
  | 'REPORT_SELECTION'
  | 'BASIC_INFO'
  | 'REPORT_FORM'
  | 'VPR_FORM'
  | 'JTSG_VMR_FORM'
  | 'JTSG_TSVS_FORM'
  | 'EVF_FORM'
  | 'REVIEW_AND_SIGN'
  | 'JTSG_VMR_REVIEW'
  | 'SUBMISSION_STATUS';

type ReportType = 'seMonthly' | 'vpr' | 'jtsgvmr' | 'evf' | 'jtsgtsvs';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; displayName: string } | null>(null);
  const [screen, setScreen] = useState<Screen>('REPORT_SELECTION');
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [esName, setEsName] = useState('');
  const [clientName, setClientName] = useState('');
  const [reportData, setReportData] = useState<Record<string, unknown>>({});
  const [typedEsName, setTypedEsName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      const email = user.email || '';
      if (!email.endsWith('@thejoshuatree.org')) {
        router.push('/login?error=org_only');
        return;
      }
      setUser({
        email,
        displayName: user.user_metadata?.full_name || user.email || '',
      });
      setEsName(user.user_metadata?.full_name || user.email || '');
      setLoading(false);
    });
  }, [router]);

  const showMessage = (msg: string, isError = false) => {
    setMessage(msg);
    const el = document.getElementById('message-container');
    if (el) {
      const div = document.createElement('div');
      div.className = `p-4 rounded-lg shadow-md mb-2 text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`;
      div.textContent = msg;
      el.appendChild(div);
      setTimeout(() => el.removeChild(div), 5000);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div id="message-container" className="fixed top-4 right-4 z-50" />
      <div className="p-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-green-600 mb-4 inline-block">
          ← Back to Home
        </Link>
      </div>

      {screen === 'REPORT_SELECTION' && (
        <ReportSelection
          user={user}
          onSelect={(type) => {
            setReportType(type);
            if (type === 'seMonthly' || type === 'jtsgvmr') {
              setScreen('BASIC_INFO');
            } else if (type === 'vpr') {
              setScreen('VPR_FORM');
            } else if (type === 'evf') {
              setScreen('EVF_FORM');
            } else if (type === 'jtsgtsvs') {
              setScreen('JTSG_TSVS_FORM');
            }
          }}
        />
      )}

      {screen === 'BASIC_INFO' && reportType && (
        <BasicInfo
          esName={esName}
          clientName={clientName}
          reportType={reportType}
          onContinue={(es, client) => {
            setEsName(es);
            setClientName(client);
            if (reportType === 'seMonthly') {
              setReportData({
                jobSeekerName: client,
                seSpecialistName: es,
                seProviderName: 'Joshua Tree Service Group',
              });
              setScreen('REPORT_FORM');
            } else if (reportType === 'jtsgvmr') {
              setReportData({ ClientName: client, ESName: es, EmploymentSpecialistName: es });
              setScreen('JTSG_VMR_FORM');
            }
          }}
        />
      )}

      {screen === 'REPORT_FORM' && (
        <SEMonthlyForm
          clientName={clientName}
          esName={esName}
          initialData={reportData}
          onReview={(data) => {
            setReportData(data);
            setTypedEsName(data.seSpecialistName as string);
            setScreen('REVIEW_AND_SIGN');
          }}
        />
      )}

      {screen === 'VPR_FORM' && (
        <VPRForm
          user={user}
          onSuccess={(msg) => {
            setMessage(msg);
            setScreen('SUBMISSION_STATUS');
          }}
          onError={(msg) => showMessage(msg, true)}
        />
      )}

      {screen === 'JTSG_VMR_FORM' && (
        <JTSGVMRForm
          initialData={reportData}
          onReview={(data) => {
            setReportData(data);
            setTypedEsName((data.EmploymentSpecialistName as string) || (data.ESName as string));
            setScreen('JTSG_VMR_REVIEW');
          }}
        />
      )}

      {screen === 'JTSG_TSVS_FORM' && (
        <JTSGTSVSForm
          user={user}
          esName={esName}
          onSuccess={(msg) => {
            setMessage(msg);
            setScreen('SUBMISSION_STATUS');
          }}
          onError={(msg) => showMessage(msg, true)}
        />
      )}

      {screen === 'EVF_FORM' && (
        <EVFForm
          user={user}
          onSuccess={(msg) => {
            setMessage(msg);
            setScreen('SUBMISSION_STATUS');
          }}
          onError={(msg) => showMessage(msg, true)}
        />
      )}

      {screen === 'REVIEW_AND_SIGN' && reportType === 'seMonthly' && (
        <>
          {submitError && (
            <div className="mx-4 mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg">
              <p className="font-semibold">Submission failed</p>
              <p className="text-sm mt-1">{submitError}</p>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <ReviewAndSign
            variant="seMonthly"
            reportData={reportData}
            typedEsName={typedEsName}
            signatureData={signatureData}
            onSignatureChange={setSignatureData}
            onTypedNameChange={setTypedEsName}
            onSubmit={async (capturedSignature, typedNameValue) => {
              setSubmitError(null);
              setLoading(true);
              try {
                const res = await fetch('/api/reports/se-monthly', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reportData: reportData,
                    typedEsName: typedNameValue || typedEsName,
                    signatureData: capturedSignature,
                  }),
                });
                let data: { error?: string } = {};
                try {
                  data = await res.json();
                } catch {
                  data = { error: `Server error (${res.status})` };
                }
                if (!res.ok) throw new Error(data.error || 'Submission failed');
                setMessage('Report submitted! You will receive an email with the final PDF shortly.');
                setScreen('SUBMISSION_STATUS');
              } catch (e) {
                setSubmitError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
            onBack={() => { setSubmitError(null); setScreen('REPORT_FORM'); }}
          />
        </>
      )}

      {screen === 'JTSG_VMR_REVIEW' && reportType === 'jtsgvmr' && (
        <>
          {submitError && (
            <div className="mx-4 mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg">
              <p className="font-semibold">Submission failed</p>
              <p className="text-sm mt-1">{submitError}</p>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <ReviewAndSign
            variant="jtsgvmr"
            reportData={reportData}
            typedEsName={typedEsName}
            signatureData={signatureData}
            onSignatureChange={setSignatureData}
            onTypedNameChange={setTypedEsName}
            onSubmit={async (capturedSignature, typedNameValue) => {
              setSubmitError(null);
              setLoading(true);
              try {
                const res = await fetch('/api/reports/jtsg-vmr', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    reportData: reportData,
                    typedEsName: typedNameValue || typedEsName,
                    signatureData: capturedSignature,
                  }),
                });
                let data: { error?: string } = {};
                try {
                  data = await res.json();
                } catch {
                  data = { error: `Server error (${res.status})` };
                }
                if (!res.ok) throw new Error(data.error || 'Submission failed');
                setMessage('Report submitted! You will receive an email with the final PDF shortly.');
                setScreen('SUBMISSION_STATUS');
              } catch (e) {
                setSubmitError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
            onBack={() => { setSubmitError(null); setScreen('JTSG_VMR_FORM'); }}
          />
        </>
      )}

      {screen === 'SUBMISSION_STATUS' && (
        <SubmissionStatus
          message={message}
          onHome={() => router.push('/')}
          onSubmitAnother={() => {
            setScreen('REPORT_SELECTION');
            setReportType('');
            setSubmitError(null);
          }}
        />
      )}
    </div>
  );
}
