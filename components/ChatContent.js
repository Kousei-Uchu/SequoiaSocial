'use client';

import { useEffect, useState } from 'react';
import sdk from 'matrix-js-sdk';
import { useRouter } from 'next/navigation';

export default function ChatContent() {
  const router = useRouter();

  const [matrixClient, setMatrixClient] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function initMatrixClient() {
      try {
        let accessToken = localStorage.getItem('mx_access_token');
        let userId = localStorage.getItem('mx_user_id');
        let homeserver = localStorage.getItem('mx_homeserver') || 'https://matrix.social.sequoiasupport.com';

        // Check URL for SSO login token
        const params = new URLSearchParams(window.location.search);
        const loginToken = params.get('loginToken');

        if (loginToken) {
          // Exchange loginToken for accessToken
          const client = sdk.createClient(homeserver);
          const loginResponse = await client.login('m.login.token', { token: loginToken });
          accessToken = loginResponse.access_token;
          userId = loginResponse.user_id;

          // Save session
          localStorage.setItem('mx_access_token', accessToken);
          localStorage.setItem('mx_user_id', userId);
          localStorage.setItem('mx_homeserver', homeserver);

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);

          router.replace('/chat'); // or wherever your chat page is
          return; // Wait for reload
        }

        if (!accessToken || !userId) {
          setErrorMsg('You must log in first.');
          setLoading(false);
          return;
        }

        const client = sdk.createClient({
          baseUrl: homeserver,
          accessToken,
          userId,
        });

        client.startClient();

        client.once('sync', (state) => {
          if (state === 'PREPARED') {
            const joinedRooms = client.getRooms();
            setRooms(joinedRooms);
            setActiveRoom(joinedRooms[0]);
            setMessages(joinedRooms[0]?.timeline || []);
            setMatrixClient(client);
            setLoading(false);
          }
        });

        // Listen for new messages (optional)
        client.on('Room.timeline', (event, room, toStartOfTimeline) => {
          if (toStartOfTimeline) return; // Ignore old events
          if (room.roomId === activeRoom?.roomId && event.getType() === 'm.room.message') {
            setMessages((msgs) => [...msgs, event]);
          }
        });
      } catch (err) {
        console.error('Matrix init error:', err);
        setErrorMsg('Failed to connect to Matrix.');
        setLoading(false);
      }
    }

    initMatrixClient();

    // Cleanup on unmount
    return () => {
      if (matrixClient) matrixClient.stopClient();
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !matrixClient || !activeRoom) return;

    await matrixClient.sendTextMessage(activeRoom.roomId, newMessage);
    setNewMessage('');
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div>Loading chat...</div>;
  }

  if (errorMsg) {
    return <div style={{ color: 'red' }}>{errorMsg}</div>;
  }

  return (
    <div className="main-layout">
      <section className="channel-list">
        <div className="search-bar">
          <input type="text" placeholder="Search rooms..." />
        </div>
        <h4>📩 Rooms</h4>
        {rooms.map((room) => (
          <div
            key={room.roomId}
            className={`channel-item ${activeRoom?.roomId === room.roomId ? 'active' : ''}`}
            onClick={() => {
              setActiveRoom(room);
              setMessages(room.timeline);
            }}
          >
            <div className="channel-icon">#</div>
            <span>{room.name || room.roomId}</span>
          </div>
        ))}
      </section>

      <section className="message-window">
        <div className="messages-container">
          {messages.map((event) => {
            const content = event.getContent();
            if (content.msgtype !== 'm.text') return null;

            return (
              <div key={event.getId()} className="message matrix-message">
                <div className="message-header">
                  <div className="message-avatar">{event.getSender()?.[1] || '?'}</div>
                  <span>{event.getSender()}</span>
                  <time className="message-time" dateTime={event.getTs()}>
                    {formatTime(event.getTs())}
                  </time>
                </div>
                <div>{content.body}</div>
              </div>
            );
          })}
        </div>

        <form className="message-input" onSubmit={handleSubmit}>
          <textarea
            placeholder="Type your message here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </div>
  );
}