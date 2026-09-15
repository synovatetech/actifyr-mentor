// ============================================
// Footer Component - Basic (not used in plans page)
// The plans page doesn't have a footer in the design
// ============================================

'use client';

export function Footer() {
  return (
    <footer 
      className="py-8 text-center"
      style={{
        background: '#1E1E1E',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
      }}
    >
      <p>© {new Date().getFullYear()} Actifyr. All rights reserved.</p>
    </footer>
  );
}
