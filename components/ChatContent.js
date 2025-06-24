'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDiscord,
  faWhatsapp,
  faTelegram,
  faFacebookMessenger,
  faInstagram,
  faGoogle,
  faTwitter,
  faSignal,
} from '@fortawesome/free-brands-svg-icons';

export default function ChatContent() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Doe',
      initials: 'JD',
      time: '2025-06-21T14:30',
      content: 'Welcome to Sequoia Social! This is our general channel for updates and discussion.',
      platform: 'discord',
    },
    {
      id: 2,
      sender: 'Alice Smith',
      initials: 'AS',
      time: '2025-06-21T14:45',
      content: 'Looks amazing so far! Love the clean dark mode. 🎉',
      platform: 'instagram',
    },
  ]);

  const [newMessage, setNewMessage] = useState('');

  const platformColors = {
    discord: ['#5865F2', '#4854cc'],
    whatsapp: ['#25D366', '#1cb955'],
    telegram: ['#0088CC', '#007ab8'],
    messenger: ['#0078FF', '#00C6FF'],
    instagram: ['#F58529', '#DD2A7B'],
    google: ['#1A73E8', '#185abc'],
    twitter: ['#1DA1F2', '#1991da'],
    signal: ['#3A76F0', '#2f62d6'],
    default: ['#444', '#333'],
  };

  const platformIcons = {
    discord: faDiscord,
    whatsapp: faWhatsapp,
    telegram: faTelegram,
    messenger: faFacebookMessenger,
    instagram: faInstagram,
    google: faGoogle,
    twitter: faTwitter,
    signal: faSignal,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: messages.length + 1,
      sender: 'John Doe',
      initials: 'JD',
      time: new Date().toISOString(),
      content: newMessage,
      platform: 'discord', // change based on user/platform input if needed
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <section className="channel-list" aria-label="Channels and Direct Messages">
        <div className="search-bar">
          <input type="text" placeholder="Search channels..." aria-label="Search channels" />
        </div>

        <h4>🏷️ Channels</h4>
        <div className="channel-item active" tabIndex="0" role="button">
          <div className="channel-icon" aria-hidden="true">#</div>
          <span>general</span>
          <div className="status-dot" aria-label="Online status"></div>
        </div>
        <div className="channel-item" tabIndex="0" role="button">
          <div className="channel-icon" aria-hidden="true">#</div>
          <span>random</span>
          <div className="status-dot" aria-label="Online status"></div>
        </div>
        <div className="channel-item" tabIndex="0" role="button">
          <div className="channel-icon" aria-hidden="true">#</div>
          <span>help</span>
          <div className="status-dot offline" aria-label="Offline status"></div>
        </div>

        <h4>📩 DMs</h4>
        <div className="channel-item" tabIndex="0" role="button">
          <div className="channel-icon" style={{ borderRadius: '50%' }} aria-hidden="true">A</div>
          <span>Alice Smith</span>
          <div className="status-dot" aria-label="Online status"></div>
        </div>
        <div className="channel-item" tabIndex="0" role="button">
          <div className="channel-icon" style={{ borderRadius: '50%' }} aria-hidden="true">B</div>
          <span>Bob Johnson</span>
          <div className="status-dot offline" aria-label="Offline status"></div>
        </div>
      </section>

      <section className="message-window" aria-label="Message window">
        <div className="messages-container" tabIndex="0">
          {messages.map(message => {
            const [colorStart, colorEnd] = platformColors[message.platform] || platformColors.default;
            const icon = platformIcons[message.platform];

            return (
              <div
                key={message.id}
                className="message"
                tabIndex="0"
                style={{
                  background: `linear-gradient(135deg, ${colorStart}, ${colorEnd})`,
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem'
                }}
              >
                <div className="message-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {icon && <FontAwesomeIcon icon={icon} title={message.platform} />}
                  <div className="message-avatar" aria-hidden="true">{message.initials}</div>
                  <span>{message.sender}</span>
                  <time
                    className="message-time"
                    dateTime={message.time}
                    style={{ fontSize: '0.8rem', color: '#e0e0e0', marginLeft: 'auto' }}
                  >
                    {formatTime(message.time)}
                  </time>
                </div>
                <div>{message.content}</div>
              </div>
            );
          })}
        </div>

        <form className="message-input" aria-label="Send a message" onSubmit={handleSubmit}>
          <textarea
            placeholder="Type your message here..."
            aria-label="Message input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </>
  );
}