'use client';

import { useState } from 'react';

export default function ChatContent() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Doe',
      initials: 'JD',
      time: '2025-06-21T14:30',
      content: 'Welcome to Sequoia Social! This is our general channel for updates and discussion.'
    },
    {
      id: 2,
      sender: 'Alice Smith',
      initials: 'AS',
      time: '2025-06-21T14:45',
      content: 'Looks amazing so far! Love the clean dark mode. 🎉'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newMsg = {
      id: messages.length + 1,
      sender: 'John Doe',
      initials: 'JD',
      time: new Date().toISOString(),
      content: newMessage
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
          {messages.map(message => (
            <div key={message.id} className="message" tabIndex="0">
              <div className="message-header">
                <div className="message-avatar" aria-hidden="true">{message.initials}</div>
                <span>{message.sender}</span>
                <time 
                  className="message-time" 
                  dateTime={message.time}
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                >
                  {formatTime(message.time)}
                </time>
              </div>
              <div>{message.content}</div>
            </div>
          ))}
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