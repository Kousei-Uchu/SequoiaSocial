'use client';

import { useState } from 'react';
import Image from 'next/image';

const platforms = [
  { id: 'discord', name: 'Discord', icon: 'https://cdn.simpleicons.org/discord/5865F2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'https://cdn.simpleicons.org/whatsapp/25D366' },
  { id: 'twitter', name: 'Twitter', icon: 'https://cdn.simpleicons.org/x/000000' },
  { id: 'bluesky', name: 'Bluesky', icon: 'https://cdn.simpleicons.org/bluesky/007AFF' },
  { id: 'gmessages', name: 'Google Messages', icon: 'https://cdn.simpleicons.org/googlemessages/1A73E8' },
  { id: 'meta', name: 'Messenger / Instagram', icon: 'https://cdn.simpleicons.org/meta/0064E0' },
  { id: 'telegram', name: 'Telegram', icon: 'https://cdn.simpleicons.org/telegram/26A5E4' },
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
      <h2>Link Your Messaging Accounts</h2>
      <ul>
        {platforms.map((platform) => {
          const isLinked = linkedAccounts[platform.id];
          return (
            <li key={platform.id}>
              <div className="platform-info">
                <Image
                  src={platform.icon}
                  alt={`${platform.name} icon`}
                  width={32}
                  height={32}
                  className="platform-icon"
                />
                <span className="platform-name">
                  {platform.name}
                  {isLinked && <span className="status-linked">Linked</span>}
                </span>
              </div>
              {isLinked ? (
                <button
                  onClick={() => handleUnlink(platform.id)}
                  className="unlink-button"
                >
                  Unlink
                </button>
              ) : (
                <button
                  onClick={() => handleLink(platform.id)}
                  className="link-button"
                >
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