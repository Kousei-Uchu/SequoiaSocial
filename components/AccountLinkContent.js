'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLink,
  faUnlink,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  faDiscord,
  faWhatsapp,
  faXTwitter,
  faGoogle,
  faFacebookMessenger,
  faTelegram,
  faBluesky
} from '@fortawesome/free-brands-svg-icons';

const platforms = [
  { id: 'discord', name: 'Discord', icon: faDiscord },
  { id: 'whatsapp', name: 'WhatsApp', icon: faWhatsapp },
  { id: 'bluesky', name: 'Bluesky', icon: faBluesky },
  { id: 'gmessages', name: 'Google Messages', icon: faGoogle },
  { id: 'meta', name: 'Messenger / Instagram', icon: faFacebookMessenger },
  { id: 'telegram', name: 'Telegram', icon: faTelegram },
];

export default function AccountLinkContent() {
  const [connectionStatus, setConnectionStatus] = useState(() => {
    const initialStatus = {};
    platforms.forEach(({ id }) => {
      initialStatus[id] = 'disconnected';
    });
    return initialStatus;
  });

  const connectBridge = async (platformId) => {
    setConnectionStatus(prev => ({ ...prev, [platformId]: 'connecting' }));
    try {
      const res = await fetch(`/api/bridges/${platformId}/connect`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to connect');
      setConnectionStatus(prev => ({ ...prev, [platformId]: 'connected' }));
    } catch (err) {
      setConnectionStatus(prev => ({ ...prev, [platformId]: 'error' }));
    }
  };

  const disconnectBridge = async (platformId) => {
    setConnectionStatus(prev => ({ ...prev, [platformId]: 'disconnecting' }));
    try {
      const res = await fetch(`/api/bridges/${platformId}/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setConnectionStatus(prev => ({ ...prev, [platformId]: 'disconnected' }));
    } catch (err) {
      setConnectionStatus(prev => ({ ...prev, [platformId]: 'error' }));
    }
  };

  const getStatusMessage = (status) => {
    switch(status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnecting':
        return 'Disconnecting...';
      case 'error':
        return 'Error! Try again.';
      default:
        return '';
    }
  };

  return (
    <section className="account-linking" aria-label="Account linking options">
      <h2>
        <FontAwesomeIcon icon={faLink} className="mr-2" />
        Link Your Messaging Accounts
      </h2>
      <ul>
        {platforms.map((platform) => {
          const status = connectionStatus[platform.id];
          const isConnected = status === 'connected';
          const isLoading = status === 'connecting' || status === 'disconnecting';
          const isError = status === 'error';

          return (
            <li key={platform.id}>
              <div className="platform-info">
                <FontAwesomeIcon 
                  icon={platform.icon} 
                  className="platform-icon" 
                />
                <span className="platform-name">
                  {platform.name}
                  {isConnected && (
                    <span className="status-linked">
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
                    </span>
                  )}
                </span>
              </div>
              <div className="status-message" aria-live="polite" style={{ marginBottom: '0.25rem', fontSize: '0.875rem', color: isError ? 'red' : 'inherit' }}>
                {getStatusMessage(status)}
              </div>
              {isConnected ? (
                <button
                  onClick={() => disconnectBridge(platform.id)}
                  className="unlink-button"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faUnlink} className="mr-1" />
                  Unlink
                </button>
              ) : (
                <button
                  onClick={() => connectBridge(platform.id)}
                  className="link-button"
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faLink} className="mr-1" />
                  Link
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}