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
    <section className="account-linking p-6 max-w-3xl mx-auto" aria-label="Channels and Direct Messages">
      <h2 className="text-2xl font-bold mb-6 text-white">Link Your Messaging Accounts</h2>
      <ul className="space-y-4">
        {platforms.map((platform) => {
          const isLinked = linkedAccounts[platform.id];
          return (
            <li
              key={platform.id}
              className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl shadow hover:bg-zinc-800 transition-all"
            >
              <div className="flex items-center space-x-4">
                <Image
                  src={platform.icon}
                  alt={`${platform.name} icon`}
                  width={28}
                  height={28}
                  className="rounded-md"
                />
                <div>
                  <span className="font-medium text-white">{platform.name}</span>
                  {isLinked && (
                    <span className="ml-2 text-green-400 text-sm">Linked</span>
                  )}
                </div>
              </div>
              {isLinked ? (
                <button
                  onClick={() => handleUnlink(platform.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm"
                >
                  Unlink
                </button>
              ) : (
                <button
                  onClick={() => handleLink(platform.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm"
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