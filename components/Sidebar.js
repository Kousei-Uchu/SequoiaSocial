'use client';

import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <a href="/home">
        <div
          className={`nav-item ${pathname === '/home' ? 'active' : ''}`}
          tabIndex="0"
          role="link"
          aria-current={pathname === '/home' ? 'page' : undefined}
        >
          <div className="nav-icon" aria-hidden="true">🏠</div>
          <div className="nav-label">Home</div>
        </div>
      </a>
      <a href="/explore">
        <div
          className={`nav-item ${pathname === '/explore' ? 'active' : ''}`}
          tabIndex="0"
          role="link"
          aria-current={pathname === '/explore' ? 'page' : undefined}
        >
          <div className="nav-icon" aria-hidden="true">🧭</div>
          <div className="nav-label">Explore</div>
        </div>
      </a>
      <a href="/">
        <div
          className={`nav-item ${pathname === '/' ? 'active' : ''}`}
          tabIndex="0"
          role="link"
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <div className="nav-icon" aria-hidden="true">🔔</div>
          <div className="nav-label">Friends</div>
        </div>
      </a>
      <a href="/chat/direct">
        <div
          className={`nav-item ${pathname === '/chat/direct' ? 'active' : ''}`}
          tabIndex="0"
          role="link"
          aria-current={pathname === '/chat/direct' ? 'page' : undefined}
        >
          <div className="nav-icon" aria-hidden="true">📩</div>
          <div className="nav-label">Direct Messages</div>
        </div>
      </a>
      <a href="/chat/rooms">
        <div
          className={`nav-item ${pathname === '/chat/rooms' ? 'active' : ''}`}
          tabIndex="0"
          role="link"
          aria-current={pathname === '/chat/rooms' ? 'page' : undefined}
        >
          <div className="nav-icon" aria-hidden="true">📩</div>
          <div className="nav-label">Direct Messages</div>
        </div>
      </a>
    </nav>
  );
}