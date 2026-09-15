// ============================================
// Navigation Hook - Simplified
// ============================================

'use client';

import { useState, useEffect } from 'react';
import type { NavItem, FooterData } from '@/types';

const MOCK_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'plans', label: 'Plans', href: '/plans' },
];

const MOCK_FOOTER_DATA: FooterData = {
  brand: {
    name: 'Actifyr',
    description: 'Learning Programs Platform',
  },
  links: [],
  copyright: `© ${new Date().getFullYear()} Actifyr. All rights reserved.`,
};

export function useNavigation() {
  const [navItems, setNavItems] = useState<NavItem[]>(MOCK_NAV_ITEMS);
  const [loading, setLoading] = useState(false);

  return { navItems, loading };
}

export function useFooter() {
  const [footerData, setFooterData] = useState<FooterData>(MOCK_FOOTER_DATA);
  const [loading, setLoading] = useState(false);

  return { footerData, loading };
}
