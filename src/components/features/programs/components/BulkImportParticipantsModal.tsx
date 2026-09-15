'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import Modal from '@/components/common/Modal';
import { programsService } from '@/services/api/programs.service';
import { useToast } from '@/context/ToastContext';
import styles from '@/styles/bulk-import-participants.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PendingParticipant {
  licenseId: number;
  accessCode: string;
}

type ImportStatus = 'valid' | 'data_missing' | 'invalid_email' | 'invalid_phone' | 'already_invited';

interface ImportEntry {
  name: string;
  email: string;
  phone: string;
  status: ImportStatus;
}

interface BulkImportParticipantsModalProps {
  programId: string | number;
  pendingParticipants: PendingParticipant[];
  codesGenerated: number;
  onSuccess: () => void;
  onClose: () => void;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function splitCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/[\s_\-]/g, '');
}

function parseParticipantsCSV(
  text: string,
): Array<{ name: string; email: string; phone: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const firstCols = splitCSVLine(lines[0]).map(normalizeHeader);
  const hasHeader =
    firstCols.includes('name') ||
    firstCols.includes('email') ||
    firstCols.some((h) => h === 'phonenumber' || h === 'phone');

  let nameIdx = 0;
  let emailIdx = 1;
  let phoneIdx = 2;
  let dataLines = lines;

  if (hasHeader) {
    nameIdx = firstCols.indexOf('name') >= 0 ? firstCols.indexOf('name') : 0;
    emailIdx = firstCols.indexOf('email') >= 0 ? firstCols.indexOf('email') : 1;
    const pIdx = firstCols.findIndex(
      (h) => h === 'phonenumber' || h === 'phone',
    );
    phoneIdx = pIdx >= 0 ? pIdx : -1;
    dataLines = lines.slice(1);
  }

  return dataLines
    .map((line) => {
      const cols = splitCSVLine(line);
      return {
        name: cols[nameIdx] || '',
        email: cols[emailIdx] || '',
        phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
      };
    })
    .filter((row) => row.name || row.email);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return /^\d{7,15}$/.test(phone.trim());
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const idx = trimmed.indexOf(' ');
  return idx === -1
    ? { firstName: trimmed, lastName: '' }
    : { firstName: trimmed.slice(0, idx), lastName: trimmed.slice(idx + 1).trim() };
}

function downloadTemplate(e: React.MouseEvent) {
  e.preventDefault();
  const csv = 'name,email,phonenumber\nJohn Doe,john@example.com,11234567890';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'participants_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Upload step ─────────────────────────────────────────────────────────────

interface UploadStepProps {
  pendingSlots: number;
  codesGenerated: number;
  checking: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}

function UploadStep({
  pendingSlots,
  codesGenerated,
  checking,
  fileInputRef,
  onFileChange,
  onClose,
}: UploadStepProps) {
  return (
    <Modal onClose={onClose} className={styles.uploadModal}>
      <h2 className={styles.modalTitle}>Import Participants</h2>

      <div className={styles.uploadBody}>
        <div className={styles.uploadHeaderRow}>
          <h3 className={styles.uploadHeading}>Upload List</h3>
          <a href="#" onClick={downloadTemplate} className={styles.templateLink}>
            Download Template
          </a>
        </div>

        <div className={styles.dropZone}>
          {checking ? (
            <p className={styles.dropText}>Processing file…</p>
          ) : (
            <>
              <p className={styles.dropText}>Drag & Drop file here or</p>
              <label className={styles.browseBtn}>
                Browse File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        </div>

        <p className={styles.note}>
          CSV columns: <strong>name</strong>, <strong>email</strong>,{' '}
          <strong>phonenumber</strong> (optional).
        </p>
        <p className={styles.note}>
          Available pending slots (Individual codes):{' '}
          <strong>{pendingSlots}</strong> of{' '}
          <strong>{codesGenerated}</strong> codes generated.
        </p>
      </div>

      <div className={styles.footer}>
        <button type="button" onClick={onClose} className={styles.cancelBtn}>
          Close
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={styles.uploadBtn}
          disabled={checking}
        >
          {checking ? 'Processing…' : 'Upload'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Verify step ─────────────────────────────────────────────────────────────

interface VerifyStepProps {
  entries: ImportEntry[];
  pendingSlots: number;
  loading: boolean;
  onRemoveRow: (index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function VerifyStep({
  entries,
  pendingSlots,
  loading,
  onRemoveRow,
  onSubmit,
  onClose,
}: VerifyStepProps) {
  const validCount = entries.filter((e) => e.status === 'valid').length;
  const errorCount = entries.filter((e) => e.status !== 'valid').length;
  const exceedsSlots = validCount > pendingSlots;

  return (
    <Modal onClose={onClose} className={styles.verifyModal}>
      <div className={styles.verifyHeader}>
        <h2 className={styles.modalTitle}>Verify Import Data</h2>
        <button type="button" onClick={onClose} className={styles.closeIconBtn}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.verifyBody}>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Total Rows</span>
            <span className={styles.statValue}>{entries.length}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Errors</span>
            <span className={`${styles.statValue} ${errorCount > 0 ? styles.statError : ''}`}>
              {errorCount}
            </span>
          </div>
          <div className={`${styles.statBox} ${styles.statBoxRight}`}>
            <span className={styles.statLabel}>Available Slots</span>
            <span className={`${styles.statValue} ${exceedsSlots ? styles.statError : ''}`}>
              {pendingSlots}
            </span>
          </div>
        </div>

        {exceedsSlots && (
          <p className={styles.warning}>
            Valid entries ({validCount}) exceed available pending slots (
            {pendingSlots}). Remove rows or generate more access codes first.
          </p>
        )}

        <div className={styles.entryList}>
          {entries.map((entry, i) => (
            <div key={i} className={styles.entryRow}>
              <span className={styles.entryName}>{entry.name || '—'}</span>
              <span className={styles.entryEmail}>{entry.email || '—'}</span>
              <span className={styles.entryPhone}>{entry.phone || '—'}</span>
              <span className={styles.entryStatus}>
                {entry.status === 'data_missing' && (
                  <span className={styles.badgeError}>Data Missing</span>
                )}
                {entry.status === 'invalid_email' && (
                  <span className={styles.badgeError}>Invalid Email</span>
                )}
                {entry.status === 'invalid_phone' && (
                  <span className={styles.badgeError}>Invalid Phone</span>
                )}
                {entry.status === 'already_invited' && (
                  <span className={styles.badgeError}>Already Invited</span>
                )}
              </span>
              <button
                type="button"
                className={styles.removeRowBtn}
                onClick={() => onRemoveRow(i)}
                aria-label="Remove row"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4H14M12.667 4V13.333C12.667 14 12 14.667 11.333 14.667H4.667C4 14.667 3.333 14 3.333 13.333V4M5.333 4V2.667C5.333 2 6 1.333 6.667 1.333H9.333C10 1.333 10.667 2 10.667 2.667V4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" onClick={onClose} className={styles.cancelBtn}>
          Close
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className={styles.submitBtn}
          disabled={validCount === 0 || errorCount > 0 || exceedsSlots || loading}
        >
          {loading ? 'Importing…' : 'Import Participants'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function BulkImportParticipantsModal({
  programId,
  pendingParticipants,
  codesGenerated,
  onSuccess,
  onClose,
}: BulkImportParticipantsModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'verify'>('upload');
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [checking, setChecking] = useState(false);

  const pendingSlots = pendingParticipants.length;

  const validateMutation = useMutation({
    mutationFn: (emails: string[]) =>
      programsService.validateInviteEmails(programId, emails),
  });

  const importMutation = useMutation({
    mutationFn: (
      participants: Array<{
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
      }>,
    ) => programsService.bulkInviteParticipants(programId, participants),
    onSuccess: (res) => {
      if (res.success) {
        showToast('Participants imported successfully', 'success');
        onSuccess();
      } else {
        showToast(res.error || 'Failed to import participants', 'error');
      }
    },
    onError: () => {
      showToast('Error during bulk import', 'error');
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setChecking(true);
    try {
      const text = await file.text();
      const parsed = parseParticipantsCSV(text);
      if (parsed.length === 0) {
        showToast('No valid data found in the CSV file', 'error');
        return;
      }

      const mapped: ImportEntry[] = parsed.map((row) => {
        let status: ImportStatus = 'valid';
        if (!row.name.trim() || !row.email.trim()) status = 'data_missing';
        else if (!isValidEmail(row.email)) status = 'invalid_email';
        else if (row.phone.trim() && !isValidPhone(row.phone)) status = 'invalid_phone';
        return { ...row, status };
      });

      const validEmails = mapped
        .filter((e) => e.status === 'valid')
        .map((e) => e.email);

      if (validEmails.length > 0) {
        try {
          const res = await validateMutation.mutateAsync(validEmails);
          if (!res.success) {
            showToast(res.error || 'Failed to validate emails', 'error');
            return;
          }
          const alreadyInvited: string[] = res.data?.already_invited_or_joined ?? [];
          if (alreadyInvited.length > 0) {
            for (const entry of mapped) {
              if (alreadyInvited.includes(entry.email)) {
                entry.status = 'already_invited';
              }
            }
          }
        } catch {
          showToast('Failed to validate emails', 'error');
          return;
        }
      }

      setEntries(mapped);
      setStep('verify');
    } catch {
      showToast('Failed to process the CSV file', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleRemoveRow = (index: number) => {
    const next = entries.filter((_, i) => i !== index);
    setEntries(next);
    if (next.length === 0) setStep('upload');
  };

  const handleSubmit = () => {
    const valid = entries.filter((e) => e.status === 'valid');
    if (valid.length === 0) return;

    const participants = valid.map((entry) => {
      const { firstName, lastName } = splitName(entry.name);
      return {
        first_name: firstName,
        last_name: lastName,
        email: entry.email,
        phone_number: entry.phone || '',
      };
    });

    importMutation.mutate(participants);
  };

  if (step === 'upload') {
    return (
      <UploadStep
        pendingSlots={pendingSlots}
        codesGenerated={codesGenerated}
        checking={checking}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        onClose={onClose}
      />
    );
  }

  return (
    <VerifyStep
      entries={entries}
      pendingSlots={pendingSlots}
      loading={importMutation.isPending}
      onRemoveRow={handleRemoveRow}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
