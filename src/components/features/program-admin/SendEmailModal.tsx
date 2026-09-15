"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import RichTextEditor from "@/components/common/RichTextEditor";
import styles from "@/styles/send-email-modal.module.css";

export interface EmailRecipient {
  id: number;
  name: string;
  email: string;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: EmailRecipient[];
  allowMultipleRecipients?: boolean;
  initialSubject?: string;
  initialContent?: string;
  isSending?: boolean;
  onSend: (data: {
    recipients: EmailRecipient[];
    participants: number[];
    subject: string;
    content: string;
  }) => void;
}

const DEFAULT_SUBJECT = "Message from Facilitator";
const DEFAULT_CONTENT = `<p>Hi</p><p></p><p></p><p></p><p>....................</p><p>This is a system-generated email. Please do not reply to this message. For any assistance or support, contact us at support@entry.com.</p>`;

const getTextContent = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function SendEmailModal({
  isOpen,
  onClose,
  recipients,
  allowMultipleRecipients = true,
  initialSubject = DEFAULT_SUBJECT,
  initialContent = DEFAULT_CONTENT,
  isSending = false,
  onSend,
}: SendEmailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [selectedRecipients, setSelectedRecipients] =
    useState<EmailRecipient[]>(recipients);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSubject(initialSubject);
    setContent(initialContent);
    setSelectedRecipients(recipients);
  }, [isOpen, recipients, initialSubject, initialContent]);

  const canSubmit = useMemo(() => {
    const validRecipientIds = selectedRecipients
      .map((item) => item.id)
      .filter((id) => Number.isFinite(id) && id > 0);

    return (
      validRecipientIds.length > 0 &&
      subject.trim().length > 0 &&
      getTextContent(content).length > 0
    );
  }, [selectedRecipients, subject, content]);

  const removeRecipient = (recipientId: number) => {
    if (!allowMultipleRecipients) return;
    setSelectedRecipients((prev) =>
      prev.filter((item) => item.id !== recipientId),
    );
  };

  const handleSend = () => {
    if (!canSubmit || isSending) return;

    const validRecipients = selectedRecipients.filter(
      (item) => Number.isFinite(item.id) && item.id > 0,
    );

    onSend({
      recipients: validRecipients,
      participants: validRecipients.map((item) => item.id),
      subject: subject.trim(),
      content,
    });
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.title}>Send Email</div>

        <div className={styles.section}>
          <label className={styles.label}>Recipients</label>
          <div>
            {selectedRecipients.map((item) => (
              <span key={item.id} className={styles.recipientChip}>
                {item.name}
                {allowMultipleRecipients && (
                  <button
                    type="button"
                    className={styles.removeRecipientBtn}
                    onClick={() => removeRecipient(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    x
                  </button>
                )}
              </span>
            ))}
            {selectedRecipients.length === 0 && (
              <span className={styles.emptyRecipients}>
                No recipients selected
              </span>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Email Subject</label>
          <input
            className={styles.subjectInput}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Enter subject"
          />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Email Content</label>
          <div className={styles.editorWrapper}>
            <RichTextEditor
              content={content}
              onChange={setContent}
              hideImageButton
              toolbarVariant="compact"
              placeholder="Write your email message"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!canSubmit || isSending}
          >
            {isSending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
