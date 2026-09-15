// ============================================
// Missing Translation Icon
// Shared indicator used anywhere a language/section
// has an untranslated item — sidebar nav, vertical
// tabs, and the Add Content language tabs.
// ============================================

interface MissingTranslationIconProps {
    className?: string;
    /** Icon width/height in px. Defaults to 18. */
    size?: number;
    /** Circle fill. Defaults to the shared error token. */
    circleColor?: string;
    /** Exclamation mark fill. Defaults to white. */
    markColor?: string;
}

export function MissingTranslationIcon({
    className,
    size = 18,
    circleColor = 'var(--color-error)',
    markColor = 'white',
}: MissingTranslationIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" fill={circleColor} />
            <rect x="11" y="6" width="2" height="7" rx="1" fill={markColor} />
            <rect x="11" y="15.5" width="2" height="2" rx="1" fill={markColor} />
        </svg>
    );
}
