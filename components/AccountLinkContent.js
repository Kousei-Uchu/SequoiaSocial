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
  { id: 'twitter', name: 'Twitter', icon: faXTwitter },
  { id: 'bluesky', name: 'Bluesky', icon: faBluesky },
  { id: 'gmessages', name: 'Google Messages', icon: faGoogle },
  { id: 'meta', name: 'Messenger / Instagram', icon: faFacebookMessenger },
  { id: 'telegram', name: 'Telegram', icon: faTelegram },
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
      <h2>
        <FontAwesomeIcon icon={faLink} className="mr-2" />
        Link Your Messaging Accounts
      </h2>
      <ul>
        {platforms.map((platform) => {
          const isLinked = linkedAccounts[platform.id];
          return (
            <li key={platform.id}>
              <div className="platform-info">
                <FontAwesomeIcon 
                  icon={platform.icon} 
                  className="platform-icon" 
                />
                <span className="platform-name">
                  {platform.name}
                  {isLinked && (
                    <span className="status-linked">
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
                    </span>
                  )}
                </span>
              </div>
              {isLinked ? (
                <button
                  onClick={() => handleUnlink(platform.id)}
                  className="unlink-button"
                >
                  <FontAwesomeIcon icon={faUnlink} className="mr-1" />
                  Unlink
                </button>
              ) : (
                <button
                  onClick={() => handleLink(platform.id)}
                  className="link-button"
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