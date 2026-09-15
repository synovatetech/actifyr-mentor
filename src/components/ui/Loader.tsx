import React from 'react';
import styles from './Loader.module.css';

interface SpinnerProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
}

export function Spinner({ size = 'medium', color = '#EE4621' }: SpinnerProps) {
    const sizeMap = {
        small: '16px',
        medium: '32px',
        large: '48px'
    };

    const dim = sizeMap[size];

    return (
        <div
            className={styles.spinner}
            style={{
                width: dim,
                height: dim,
                borderColor: `${color}40`,
                borderTopColor: color
            }}
        />
    );
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
    return (
        <div className={styles.pageLoaderContainer}>
            <Spinner size="large" />
            {text && <p className={styles.loaderText}>{text}</p>}
        </div>
    );
}
