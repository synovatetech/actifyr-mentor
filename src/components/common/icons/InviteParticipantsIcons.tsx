import { ReactNode } from 'react';

interface IconProps {
    className?: string;
    size?: number;
}

export function AccessCodeIcon({ className, size = 54 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
            {/* Corner Brackets */}
            <path d="M11 17V12C11 11.4477 11.4477 11 12 11H17" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M31 11H36C36.5523 11 37 11.4477 37 12V17" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M37 31V36C37 36.5523 36.5523 37 36 37H31" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M17 37H12C11.4477 37 11 36.5523 11 36V31" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />

            {/* Padlock in Center */}
            <rect x="20" y="25" width="8" height="7" rx="1.2" stroke="#FF7A5C" strokeWidth="1.5" />
            <path d="M21.5 25V23.5C21.5 22.1193 22.6193 21 24 21C25.3807 21 26.5 22.1193 26.5 23.5V25" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

export function UserListIcon({ className, size = 54 }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
            {/* List Container Rectangle */}
            <rect x="13.5" y="10" width="21" height="28" rx="2" stroke="#FF7A5C" strokeWidth="1.5" />

            {/* User Rows */}
            {/* Row 1 */}
            <circle cx="17.5" cy="15.5" r="1.5" stroke="#FF7A5C" strokeWidth="1.2" />
            <path d="M16 19.5C16 18.8 16.5 18.2 17.5 18.2C18.5 18.2 19 18.8 19 19.5" stroke="#FF7A5C" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="22" y1="16.5" x2="30" y2="16.5" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="19.5" x2="27" y2="19.5" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />

            {/* Row 2 */}
            <circle cx="17.5" cy="23.5" r="1.5" stroke="#FF7A5C" strokeWidth="1.2" />
            <path d="M16 27.5C16 26.8 16.5 26.2 17.5 26.2C18.5 26.2 19 26.8 19 27.5" stroke="#FF7A5C" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="22" y1="24" x2="30" y2="24" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="27" x2="27" y2="27" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />

            {/* Row 3 */}
            <circle cx="17.5" cy="31.5" r="1.5" stroke="#FF7A5C" strokeWidth="1.2" />
            <path d="M16 35.5C16 34.8 16.5 34.2 17.5 34.2C18.5 34.2 19 34.8 19 35.5" stroke="#FF7A5C" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="22" y1="32" x2="30" y2="32" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="22" y1="35" x2="27" y2="35" stroke="#FF7A5C" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
