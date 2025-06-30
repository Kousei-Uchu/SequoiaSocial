'use client';

import { useEffect } from 'react';
import ChatContent from '../../../components/ChatContent';

export default function Chat() {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.setImmediate === 'undefined') {
      (window as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
        setTimeout(fn, 0, ...args);
    }
  }, []);
  
  return (
    <div className="chat-layout">
      <ChatContent />
    </div>
  );
}