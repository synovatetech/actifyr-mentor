'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/context/ToastContext';
import { programsService } from '@/services/api/programs.service';
import retailStyles from '@/styles/invite-participants-retail.module.css';
import modalStyles from '@/styles/generate-access-code-modal.module.css';

interface GenerateAccessCodeModalProps {
    programId: string | number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GenerateAccessCodeModal({ programId, onClose, onSuccess }: GenerateAccessCodeModalProps) {
    const { showToast } = useToast();
    const [mounted, setMounted] = useState(false);

    const [codeType, setCodeType] = useState<'individual' | 'group'>('individual');
    const [numParticipants, setNumParticipants] = useState('');
    const [codePrefix, setCodePrefix] = useState('');
    const [groupCode, setGroupCode] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleGenerate = async () => {
        if (!numParticipants) {
            showToast('Please enter the number of participants', 'error');
            return;
        }

        if (codeType === 'individual' && (!codePrefix || codePrefix.length < 6)) {
            showToast('Please enter a 6-8 digit code prefix', 'error');
            return;
        }

        if (codeType === 'group' && (!groupCode || groupCode.length < 6)) {
            showToast('Please enter a 6-8 digit group code', 'error');
            return;
        }

        if (!programId) {
            showToast('Program ID is missing. Cannot generate code.', 'error');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                code_type: codeType,
                number_of_participants: parseInt(numParticipants, 10),
                prefix: codeType === 'individual' ? codePrefix : undefined,
                group_code: codeType === 'group' ? groupCode : undefined
            };

            const response = await programsService.generateAccessCode(programId, payload);

            if (response.success) {
                showToast('Access code created successfully', 'success');
                onSuccess(); // Triggers a list refresh & closes the modal
            } else {
                showToast(response.error || 'Failed to generate access code', 'error');
            }
        } catch (error) {
            console.error('Error generating access code:', error);
            showToast('An error occurred while generating access code', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div className={modalStyles.modalOverlay} onClick={onClose}>
            <div className={modalStyles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <button className={modalStyles.closeIcon} onClick={onClose} disabled={loading}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <h2 className={retailStyles.sectionTitle}>Generate Access Code</h2>

                <div className={retailStyles.cardSection}>
                    {/* Left Column */}
                    <div className={retailStyles.leftColumn}>
                        <h3 className={retailStyles.subTitle}>Select the type of Access Code</h3>
                        <ul className={retailStyles.listDescription}>
                            <li className={retailStyles.listItem}>
                                <strong>Individual Code:</strong> Requires the email addresses of all participants. A unique access code is generated for each participant
                            </li>
                            <li className={retailStyles.listItem}>
                                <strong>Group Code:</strong> Generates a single code that can be shared with all participants. Email addresses are not required to create this code
                            </li>
                        </ul>

                        <div className={retailStyles.typeSelector}>
                            <button
                                className={`${retailStyles.typeButton} ${codeType === 'individual' ? retailStyles.typeButtonActive : ''}`}
                                onClick={() => setCodeType('individual')}
                            >
                                <div className={retailStyles.typeIcon}>
                                    <img src="/Individual_code_icon.svg" alt="Individual Code" />
                                </div>
                                <span>Individual</span>
                                <span>Code</span>
                            </button>
                            <button
                                className={`${retailStyles.typeButton} ${codeType === 'group' ? retailStyles.typeButtonActive : ''}`}
                                onClick={() => setCodeType('group')}
                            >
                                <div className={retailStyles.typeIcon}>
                                    <img src="/Group_code_icon.svg" alt="Group Code" />
                                </div>
                                <span>Group</span>
                                <span>Code</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={retailStyles.rightColumn}>
                        <div className={retailStyles.inputGroup}>
                            <label className={retailStyles.inputLabel}>Number of Participants</label>
                            <p className={retailStyles.inputSubtext}>
                                To generate access codes for participants, ensure you have enough licenses available — one license is required per participant
                            </p>
                            <input
                                type="number"
                                className={retailStyles.inputBox}
                                placeholder="Enter the number of participants"
                                value={numParticipants}
                                onChange={(e) => setNumParticipants(e.target.value)}
                            />
                        </div>

                        {codeType === 'individual' ? (
                            <div className={retailStyles.inputGroup}>
                                <label className={retailStyles.inputLabel}>Code Prefix</label>
                                <p className={retailStyles.inputSubtext}>
                                    Add a prefix to customize your access code. The prefix must be 6–8 characters long and may include letters and numbers
                                </p>
                                <input
                                    type="text"
                                    className={retailStyles.inputBox}
                                    placeholder="Enter 6-8 digit code prefix"
                                    maxLength={8}
                                    value={codePrefix}
                                    onChange={(e) => setCodePrefix(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className={retailStyles.inputGroup}>
                                <label className={retailStyles.inputLabel}>Group Code</label>
                                <p className={retailStyles.inputSubtext}>
                                    Generate a group code to share with all participants. Please note that anyone with this code can use it until the participant limit specified above is reached
                                </p>
                                <input
                                    type="text"
                                    className={retailStyles.inputBox}
                                    placeholder="Enter 6-8 digit group code"
                                    maxLength={8}
                                    value={groupCode}
                                    onChange={(e) => setGroupCode(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className={retailStyles.actionRow}>
                    <button className={retailStyles.backBtn} onClick={onClose} disabled={loading}>Cancel</button>
                    <button className={retailStyles.generateBtn} onClick={handleGenerate} disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Access Code'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
