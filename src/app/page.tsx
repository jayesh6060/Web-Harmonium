'use client';

import Piano from '@/components/Piano';

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Piano />
    </div>
  );
}
