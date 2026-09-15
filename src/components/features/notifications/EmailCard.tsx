'use client';

import React from 'react';
import styles from '@/styles/notifications.module.css';

interface EmailCardProps {
    email: {
        id: string | number;
        subject: string;
        content: string;
    };
    onEdit: (email: any) => void;
    onDelete?: (id: string | number) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, onEdit, onDelete }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    // Strip HTML for the snippet
    const getSnippet = (html: string) => {
        if (typeof document === 'undefined') return html;
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    return (
        <div className={styles.notificationCard}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{email.subject}</h3>
                <div className={styles.moreMenuContainer} ref={menuRef}>
                    <div className={styles.moreMenu} onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}>⋮</div>
                    {showMenu && (
                        <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.dropdownItem} onClick={(e) => {
                                e.stopPropagation();
                                if (onDelete) onDelete(email.id);
                                setShowMenu(false);
                            }}>
                                Delete
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.cardBody}>
                {getSnippet(email.content)}
            </div>
            <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => onEdit(email)}>
                    Edit
                </button>
            </div>
        </div>
    );
};

export default EmailCard;
