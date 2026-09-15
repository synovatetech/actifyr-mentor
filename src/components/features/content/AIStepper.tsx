'use client';

import React from 'react';
import styles from '@/styles/ai-content.module.css';

interface Step {
    id: number;
    label: string;
}

const steps: Step[] = [
    { id: 1, label: 'Add Details' },
    { id: 2, label: 'Approve Tokens' },
    { id: 3, label: 'Table of Content' },
    { id: 4, label: 'Generate Content' },
];

interface AIStepperProps {
    currentStep: number;
}

export function AIStepper({ currentStep }: AIStepperProps) {
    return (
        <div className={styles.stepper}>
            {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                    <div key={step.id} className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}>
                        <div className={`${styles.stepCircle} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}>
                            {isCompleted && (
                                <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 4.5L4.5 8L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <span className={styles.stepLabel}>{step.label}</span>
                        {index < steps.length - 1 && (
                            <div className={`${styles.stepLine} ${isCompleted ? styles.completed : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
