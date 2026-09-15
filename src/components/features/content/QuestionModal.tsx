'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/add-content-modal.module.css';
import RichTextEditor from '@/components/common/RichTextEditor';

interface QuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    itemNumber: number;
    /** Used for per-language translation — the correct answer always mirrors English and isn't editable per language. */
    lockCorrectAnswer?: boolean;
}

export default function QuestionModal({ isOpen, onClose, onSave, initialData, itemNumber, lockCorrectAnswer }: QuestionModalProps) {
    const [mounted, setMounted] = useState(false);
    const [question, setQuestion] = useState('');
    const [optionA, setOptionA] = useState('');
    const [optionB, setOptionB] = useState('');
    const [optionC, setOptionC] = useState('');
    const [optionD, setOptionD] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const incomingAnswer = String(initialData.right_answer || '').toUpperCase();
                const normalizedAnswer =
                    incomingAnswer === 'OPTION_A' ? 'A' :
                        incomingAnswer === 'OPTION_B' ? 'B' :
                            incomingAnswer === 'OPTION_C' ? 'C' :
                                incomingAnswer === 'OPTION_D' ? 'D' :
                                    ['A', 'B', 'C', 'D'].includes(incomingAnswer) ? incomingAnswer : '';
                setQuestion(initialData.question || '');
                setOptionA(initialData.option_a || '');
                setOptionB(initialData.option_b || '');
                setOptionC(initialData.option_c || '');
                setOptionD(initialData.option_d || '');
                setCorrectAnswer(normalizedAnswer);
            } else {
                setQuestion('');
                setOptionA('');
                setOptionB('');
                setOptionC('');
                setOptionD('');
                setCorrectAnswer('');
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    if (!mounted || !isOpen) return null;

    const getPlainText = (value: string) =>
        value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const clearError = (key: string) => {
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleFieldBlur = (field: 'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'correctAnswer') => {
        if (field === 'question' && getPlainText(question)) clearError('question');
        if (field === 'optionA' && optionA.trim()) clearError('optionA');
        if (field === 'optionB' && optionB.trim()) clearError('optionB');
        if (field === 'optionC' && optionC.trim()) clearError('optionC');
        if (field === 'optionD' && optionD.trim()) clearError('optionD');
        if (field === 'correctAnswer' && correctAnswer) clearError('correctAnswer');
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        if (!getPlainText(question)) nextErrors.question = 'Question is required';
        if (!optionA.trim()) nextErrors.optionA = 'Option A is required';
        if (!optionB.trim()) nextErrors.optionB = 'Option B is required';
        if (!optionC.trim()) nextErrors.optionC = 'Option C is required';
        if (!optionD.trim()) nextErrors.optionD = 'Option D is required';
        if (!correctAnswer) nextErrors.correctAnswer = 'Please choose the correct answer';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            question,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            right_answer: correctAnswer
        });
        onClose();
    };

    return createPortal(
        <div className={styles.modalOverlay} style={{ zIndex: 100000 }}>
            <div className={styles.modalContainer} style={{ width: '600px', height: 'auto', maxHeight: '90vh' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle} style={{ color: '#EE4621' }}>
                        {initialData ? 'Edit' : 'Add'} Question #{itemNumber}
                    </div>
                    <div className={styles.closeIcon} onClick={onClose}>✕</div>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
                        <label className={styles.commonLabel} style={{ marginBottom: 0 }}>Question<span style={{ color: '#DC2626' }}>*</span></label>
                        <div style={{ height: '8px' }}></div>
                        <div onBlurCapture={() => handleFieldBlur('question')}>
                            <RichTextEditor content={question} onChange={setQuestion} placeholder="Enter the question here" hideImageButton={true} />
                        </div>
                        {errors.question && (
                            <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '6px' }}>{errors.question}</div>
                        )}
                    </div>

                    <div className={styles.inputLabel} style={{ marginBottom: '12px' }}>Answers</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        {[
                            { label: 'A', value: optionA, setter: setOptionA, key: 'A' },
                            { label: 'B', value: optionB, setter: setOptionB, key: 'B' },
                            { label: 'C', value: optionC, setter: setOptionC, key: 'C' },
                            { label: 'D', value: optionD, setter: setOptionD, key: 'D' },
                        ].map((opt) => (
                            <div key={opt.key} className={`${styles.optionBox} ${correctAnswer === opt.key ? styles.optionBoxCorrect : ''}`}>
                                <div
                                    className={`${styles.optionLetter} ${correctAnswer === opt.key ? styles.optionLetterCorrect : ''}`}
                                    onClick={() => {
                                        if (lockCorrectAnswer) return;
                                        setCorrectAnswer(opt.key);
                                        clearError('correctAnswer');
                                    }}
                                    style={{ cursor: lockCorrectAnswer ? 'default' : 'pointer' }}
                                >
                                    {opt.label}
                                </div>
                                <input
                                    className={styles.optionTextInput}
                                    placeholder={`Enter Option ${opt.label}`}
                                    value={opt.value}
                                    onChange={(e) => opt.setter(e.target.value)}
                                    onBlur={() => handleFieldBlur(`option${opt.key}` as 'optionA' | 'optionB' | 'optionC' | 'optionD')}
                                />
                            </div>
                        ))}
                        {(errors.optionA || errors.optionB || errors.optionC || errors.optionD) && (
                            <div style={{ color: '#DC2626', fontSize: '12px' }}>
                                {errors.optionA || errors.optionB || errors.optionC || errors.optionD}
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.commonLabel}>Choose Correct Answer<span style={{ color: '#DC2626' }}>*</span></label>
                        <select
                            className={styles.selectInput}
                            style={{ width: '100%' }}
                            value={correctAnswer}
                            onChange={(e) => setCorrectAnswer(e.target.value)}
                            onBlur={() => handleFieldBlur('correctAnswer')}
                            disabled={lockCorrectAnswer}
                        >
                            <option value="" disabled>Select correct answer</option>
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                        </select>
                        {lockCorrectAnswer && (
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '6px' }}>
                                The correct answer is set from the English content and can&apos;t be changed here.
                            </div>
                        )}
                        {errors.correctAnswer && (
                            <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '6px' }}>{errors.correctAnswer}</div>
                        )}
                    </div>
                </div>

                <div className={styles.modalFooterCentered} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <button className={styles.cancelBtnCentered} onClick={onClose}>Close</button>
                    <button className={styles.saveBtnCentered} onClick={handleSave}>Save Question</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
