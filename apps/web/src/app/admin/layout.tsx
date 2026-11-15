'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const tokenKey = 'shopradar-admin-token';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(tokenKey)) {
      setAllowed(false);
      router.replace('/');
      return;
    }
    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Checking admin access…</main>;
  }

  return children;
}
