'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { ALL_VPR_SERVICE_STAGES } from '@/lib/constants';

interface Props {
  userEmail: string;
  isSuperadmin: boolean;
}

interface AdminConfig {
  drive_folders: Record<string, string | Record<string, string>>;
  doc_templates: Record<string, string>;
  report_notification_recipients: string[];
}

interface Supervisor {
  id: string;
  email: string;
  role: string;
}

export function AdminPortal({ userEmail, isSuperadmin }: Props) {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newSupervisorEmail, setNewSupervisorEmail] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [configRes, supervisorsRes] = await Promise.all([
        fetch('/api/admin/config'),
        isSuperadmin ? fetch('/api/admin/supervisors') : Promise.resolve(null),
      ]);
      if (configRes.ok) {
        const d = await configRes.json();
        setConfig(d);
      }
      if (supervisorsRes?.ok) {
        const s = await supervisorsRes.json();
        setSupervisors(s);
      }
    } catch (e) {
      setMessage('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<AdminConfig>) => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setConfig((c) => (c ? { ...c, ...updates } : null));
      setMessage('Saved successfully');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    const email = newRecipient.trim().toLowerCase();
    if (!email || !config) return;
    if (config.report_notification_recipients.includes(email)) return;
    saveConfig({ report_notification_recipients: [...config.report_notification_recipients, email] });
    setNewRecipient('');
  };

  const removeRecipient = (email: string) => {
    if (!config) return;
    saveConfig({
      report_notification_recipients: config.report_notification_recipients.filter((e) => e !== email),
    });
  };

  const addSupervisor = async () => {
    const email = newSupervisorEmail.trim().toLowerCase();
    if (!email || !email.endsWith('@thejoshuatree.org')) {
      setMessage('Supervisors must have @thejoshuatree.org email');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Add failed');
      await load();
      setNewSupervisorEmail('');
      setMessage('Supervisor added');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/migrate-vpr', { method: 'POST' });
      const text = await res.text();
      let data: { error?: string; migrated?: number; skipped?: number } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMessage(text || 'Failed to parse response');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Migration failed');
      setMessage(`Migration complete: ${data.migrated ?? 0} records migrated, ${data.skipped ?? 0} skipped (older than 60 days)`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setMigrating(false);
    }
  };

  const removeSupervisor = async (id: string) => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/supervisors?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Remove failed');
      await load();
      setMessage('Supervisor removed');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateFolder = (key: string, value: string, subKey?: string) => {
    if (!config) return;
    const folders = { ...config.drive_folders } as Record<string, string | Record<string, string>>;
    if (subKey) {
      const sub = { ...((folders[key] as Record<string, string>) || {}) };
      sub[subKey] = value;
      folders[key] = sub;
    } else {
      folders[key] = value;
    }
    saveConfig({ drive_folders: folders });
  };

  const updateTemplate = (key: string, value: string) => {
    if (!config) return;
    saveConfig({ doc_templates: { ...config.doc_templates, [key]: value } });
  };

  const uploadJtsgTsvsTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setMessage('Please select a PDF file');
      setUploadingTemplate(false);
      return;
    }
    setUploadingTemplate(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-jtsg-tsvs-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setConfig((c) => c ? { ...c, doc_templates: { ...c.doc_templates, jtsg_tsvs: 'jtsg-tsvs-template.pdf' } } : null);
      setMessage('Template uploaded successfully. Users can now download it from the JTSG TSVS form.');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  const folders = config.drive_folders as Record<string, string | Record<string, string>>;
  const vprByStage = (folders.vpr_by_stage as Record<string, string>) || {};
  const templates = config.doc_templates || {};

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-800">Admin Portal</h1>
        <div className="flex gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600">
            Back to Home
          </Link>
          <SignOutButton />
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg mb-4 ${message.includes('Failed') || message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {message}
        </div>
      )}

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Drive Folder IDs</h2>
        <p className="text-sm text-gray-600 mb-4">
          Enter the Google Drive folder ID for each report type. Create folders in Drive, then copy the ID from the URL.
        </p>
        <div className="space-y-4">
          {[
            { key: 'se_monthly', label: 'SE Monthly Reports' },
            { key: 'vpr_default', label: 'VPR Default (fallback)' },
            { key: 'jtsg_vmr', label: 'JTSG Vocational Monthly Reports' },
            { key: 'evf', label: 'Employment Verification Form' },
            { key: 'jtsg_tsvs', label: 'JTSG Time Sheet' },
            { key: 'signature_temp', label: 'Signature Temp (for PDF generation)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={(folders[key] as string) || ''}
                onChange={(e) => updateFolder(key, e.target.value)}
                placeholder="Drive folder ID"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">VPR by Service Stage</h3>
            {ALL_VPR_SERVICE_STAGES.map((stage) => (
              <div key={stage} className="mb-2">
                <label className="block text-xs text-gray-600">{stage}</label>
                <input
                  type="text"
                  value={vprByStage[stage] || ''}
                  onChange={(e) => updateFolder('vpr_by_stage', e.target.value, stage)}
                  placeholder="Folder ID"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Google Doc Template IDs</h2>
        <div className="space-y-4">
          {[
            { key: 'se_monthly', label: 'SE Monthly' },
            { key: 'vpr', label: 'VPR' },
            { key: 'jtsg_vmr', label: 'JTSG VMR' },
            { key: 'evf', label: 'EVF' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={templates[key] || ''}
                onChange={(e) => updateTemplate(key, e.target.value)}
                placeholder="Google Doc ID"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">JTSG TSVS Template (PDF)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a PDF template for the JTSG Time Sheet form. Users can download it directly from the report page.
        </p>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={uploadJtsgTsvsTemplate}
              disabled={uploadingTemplate}
              className="hidden"
            />
            {uploadingTemplate ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload PDF template
              </>
            )}
          </label>
          {templates.jtsg_tsvs && (
            <span className="text-sm text-green-600">Template uploaded</span>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Report Notification Recipients</h2>
        <p className="text-sm text-gray-600 mb-4">
          Email addresses that receive the Missing Reports List (7th) and Overdue Reports (10th). Can include external addresses.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={addRecipient}
            disabled={saving}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {config.report_notification_recipients.map((email) => (
            <li key={email} className="flex justify-between items-center">
              <span className="text-sm">{email}</span>
              <button
                onClick={() => removeRecipient(email)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
          {config.report_notification_recipients.length === 0 && (
            <li className="text-sm text-gray-500">No recipients. Add emails above.</li>
          )}
        </ul>
      </section>

      {isSuperadmin && (
        <>
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">VPR Migration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Migrate VPR data from the existing Google Sheet (VPR_MIGRATION_SHEET_ID) into Supabase. Only records less than 60 days old are migrated. Run once before going live.
          </p>
          <button
            onClick={runMigration}
            disabled={migrating}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50"
          >
            {migrating ? 'Migrating...' : 'Run VPR Migration'}
          </button>
        </section>
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Supervisors</h2>
          <p className="text-sm text-gray-600 mb-4">
            Supervisors can access the Admin Portal. Only @thejoshuatree.org emails. You cannot remove yourself.
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={newSupervisorEmail}
              onChange={(e) => setNewSupervisorEmail(e.target.value)}
              placeholder="supervisor@thejoshuatree.org"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={addSupervisor}
              disabled={saving}
              className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              Add Supervisor
            </button>
          </div>
          <ul className="space-y-2">
            {supervisors.map((s) => (
              <li key={s.id} className="flex justify-between items-center">
                <span className="text-sm">
                  {s.email} {s.role === 'superadmin' && '(Superadmin)'}
                </span>
                {s.role !== 'superadmin' && (
                  <button
                    onClick={() => removeSupervisor(s.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        </>
      )}
    </div>
  );
}
