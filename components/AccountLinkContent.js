'use client';

import { useState } from 'react';

const platforms = [
  { id: 'discord', name: 'Discord', icon: 'fab fa-discord' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'fab fa-whatsapp' },
  { id: 'twitter', name: 'Twitter', icon: 'fab fa-x-twitter' },
  { id: 'bluesky', name: 'Bluesky', icon: 'fas fa-cloud' },
  { id: 'gmessages', name: 'Google Messages', icon: 'fab fa-google' },
  { id: 'meta', name: 'Messenger / Instagram', icon: 'fab fa-facebook-messenger' },
  { id: 'telegram', name: 'Telegram', icon: 'fab fa-telegram' },
];

export default function AccountLinkContent() {
  const [linkedAccounts, setLinkedAccounts] = useState({});

  const handleLink = (platformId) => {
    setLinkedAccounts((prev) => ({ ...prev, [platformId]: true }));
  };

  const handleUnlink = (platformId) => {
    setLinkedAccounts((prev) => {
      const newState = { ...prev };
      delete newState[platformId];
      return newState;
    });
  };

  return (
    <section className="account-linking" aria-label="Account linking options">
      <h2><i className="fas fa-link mr-2"></i>Link Your Messaging Accounts</h2>
      <ul>
        {platforms.map((platform) => {
          const isLinked = linkedAccounts[platform.id];
          return (
            <li key={platform.id}>
              <div className="platform-info">
                <i className={`${platform.icon} platform-icon`}></i>
                <span className="platform-name">
                  {platform.name}
                  {isLinked && <span className="status-linked"><i className="fas fa-check-circle ml-2"></i></span>}
                </span>
              </div>
              {isLinked ? (
                <button
                  onClick={() => handleUnlink(platform.id)}
                  className="unlink-button"
                >
                  <i className="fas fa-unlink mr-1"></i> Unlink
                </button>
              ) : (
                <button
                  onClick={() => handleLink(platform.id)}
                  className="link-button"
                >
                  <i className="fas fa-link mr-1"></i> Link
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}