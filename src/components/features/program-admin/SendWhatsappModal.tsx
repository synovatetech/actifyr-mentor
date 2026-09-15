"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "@/styles/send-whatsapp-modal.module.css";
import type { EmailRecipient } from "@/components/features/program-admin/SendEmailModal";
import type { WhatsappTemplate } from "@/services/api/whatsappMessage.service";

interface SendWhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: EmailRecipient[];
  allowMultipleRecipients?: boolean;
  templates: WhatsappTemplate[];
  isLoadingTemplates?: boolean;
  isSending?: boolean;
  isTrial?: boolean;
  onSend: (data: {
    recipients: EmailRecipient[];
    participant_ids: number[];
    template_name: string;
  }) => void;
}

export default function SendWhatsappModal({
  isOpen,
  onClose,
  recipients,
  allowMultipleRecipients = false,
  templates,
  isLoadingTemplates = false,
  isSending = false,
  isTrial = false,
  onSend,
}: SendWhatsappModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedRecipients, setSelectedRecipients] =
    useState<EmailRecipient[]>(recipients);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedRecipients(recipients);
  }, [isOpen, recipients]);

  useEffect(() => {
    if (!isOpen) return;
    if (!templates.length) {
      setSelectedTemplateName("");
      return;
    }

    const hasCurrent = templates.some((t) => t.name === selectedTemplateName);
    if (!hasCurrent) {
      setSelectedTemplateName(templates[0].name);
    }
  }, [isOpen, templates, selectedTemplateName]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.name === selectedTemplateName) || null,
    [templates, selectedTemplateName],
  );

  const removeRecipient = (recipientId: number) => {
    if (!allowMultipleRecipients) return;
    setSelectedRecipients((prev) => prev.filter((item) => item.id !== recipientId));
  };

  const canSubmit = useMemo(() => {
    const participantIds = selectedRecipients
      .map((item) => item.id)
      .filter((id) => Number.isFinite(id) && id > 0);
    return participantIds.length > 0 && selectedTemplateName.length > 0;
  }, [selectedRecipients, selectedTemplateName]);

  const handleSend = () => {
    if (!canSubmit || isSending) return;
    const validRecipients = selectedRecipients.filter(
      (item) => Number.isFinite(item.id) && item.id > 0,
    );

    onSend({
      recipients: validRecipients,
      participant_ids: validRecipients.map((item) => item.id),
      template_name: selectedTemplateName,
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
        aria-label="Send Whatsapp Notification"
      >
        <div className={styles.title}>Send Whatsapp Notification</div>

        {isTrial && (
          <div className={styles.trialNotice}>
            Whatsapp messages cannot be sent in Trial mode
          </div>
        )}

        <div className={styles.section}>
          <label className={styles.label}>Recipients</label>
          <div className={styles.chipsWrap}>
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
              <span className={styles.emptyRecipients}>No recipients selected</span>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Choose Template</label>
          <select
            className={styles.selectInput}
            value={selectedTemplateName}
            onChange={(event) => setSelectedTemplateName(event.target.value)}
            disabled={isLoadingTemplates || !templates.length}
          >
            {isLoadingTemplates ? (
              <option value="">Loading templates...</option>
            ) : templates.length === 0 ? (
              <option value="">No templates available</option>
            ) : (
              templates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Message Content</label>
          <textarea
            className={styles.messageBox}
            value={selectedTemplate?.body || ""}
            readOnly
          />
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
            disabled={!canSubmit || isSending || isLoadingTemplates}
          >
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

