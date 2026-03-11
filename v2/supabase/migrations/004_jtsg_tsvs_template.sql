-- Add jtsg_tsvs to doc_templates for JTSG Time Sheet template (Drive file ID for download)
UPDATE admin_config
SET doc_templates = doc_templates || '{"jtsg_tsvs": ""}'::jsonb
WHERE NOT (doc_templates ? 'jtsg_tsvs');
