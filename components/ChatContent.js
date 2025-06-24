'use client';

import { useEffect, useState, useRef } from 'react';
import sdk from 'matrix-js-sdk';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDiscord,
  faTelegram,
  faTwitter,
  faWhatsapp,
  faFacebookMessenger,
  faGoogle,
  faApple,
  faSms,
  faComment,
} from '@fortawesome/free-brands-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

const platformMap = {
  discord: { color: 'linear-gradient(135deg, #7289da, #5865f2)', icon: faDiscord },
  telegram: { color: 'linear-gradient(135deg, #2ca5e0, #0088cc)', icon: faTelegram },
  twitter: { color: 'linear-gradient(135deg, #1DA1F2, #0d8ddb)', icon: faTwitter },
  whatsapp: { color: 'linear-gradient(135deg, #25d366, #128c7e)', icon: faWhatsapp },
  messenger: { color: 'linear-gradient(135deg, #00b2ff, #006aff)', icon: faFacebookMessenger },
  google: { color: 'linear-gradient(135deg, #34a853, #4285f4)', icon: faGoogle },
  imessage: { color: 'linear-gradient(135deg, #1db954, #007aff)', icon: faApple },
  sms: { color: 'linear-gradient(135deg, #444, #999)', icon: faSms },
  unknown: { color: 'linear-gradient(135deg, #888, #555)', icon: faComment },
};

export default function ChatContent() {
  const router = useRouter();

  const [matrixClient, setMatrixClient] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isPaginatingRef = useRef(false);

  useEffect(() => {
    async function initMatrixClient() {
      try {
        let accessToken = localStorage.getItem('mx_access_token');
        let userId = localStorage.getItem('mx_user_id');
        let homeserver = localStorage.getItem('mx_homeserver') || 'https://matrix.social.sequoiasupport.com';

        const client = sdk.createClient({ baseUrl: homeserver, accessToken, userId });
        client.startClient();

        client.once('sync', (state) => {
          if (state === 'PREPARED') {
            const directMap = client.getAccountData('m.direct')?.getContent() || {};
            const dmRoomIds = new Set(Object.values(directMap).flat());
            const dmRooms = client.getRooms().filter(r => dmRoomIds.has(r.roomId));

            setRooms(dmRooms);
            setActiveRoom(dmRooms[0]);
            setMessages(dmRooms[0]?.timeline || []);
            detectPlatform(dmRooms[0]?.timeline || []);
            setMatrixClient(client);
            setLoading(false);
          }
        });

        client.on('Room.timeline', (event, room, toStartOfTimeline) => {
          if (toStartOfTimeline) return;
          if (room.roomId === activeRoom?.roomId && event.getType() === 'm.room.message') {
            setMessages((msgs) => [...msgs, event]);
            detectPlatform([...messages, event]);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      } catch (err) {
        console.error('Matrix init error:', err);
        setErrorMsg('Failed to connect to Matrix.');
        setLoading(false);
      }
    }

    initMatrixClient();
  }, [router]);

  const detectPlatform = (msgs) => {
    const last = [...msgs].reverse().find(e => e.getType() === 'm.room.message');
    const platform = last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !activeRoom || isPaginatingRef.current) return;
    if (container.scrollTop < 100) {
      isPaginatingRef.current = true;
      activeRoom.paginate(20, true).then(() => {
        setMessages([...activeRoom.timeline]);
      }).finally(() => {
        isPaginatingRef.current = false;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !matrixClient || !activeRoom) return;

    await matrixClient.sendTextMessage(activeRoom.roomId, newMessage);
    setNewMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div>Loading chat...</div>;
  if (errorMsg) return <div style={{ color: 'red' }}>{errorMsg}</div>;

  return (
    <div className="main-layout">
      <section className="channel-list">
        <div className="search-bar">
          <input type="text" placeholder="Search DMs..." />
        </div>
        <h4>📩 DMs</h4>
        {rooms.map((room) => (
          <div
            key={room.roomId}
            className={`channel-item ${activeRoom?.roomId === room.roomId ? 'active' : ''}`}
            onClick={() => {
              setActiveRoom(room);
              setMessages(room.timeline);
              detectPlatform(room.timeline);
            }}
          >
            <div className="channel-icon">#</div>
            <span>{room.name || room.roomId}</span>
          </div>
        ))}
      </section>

      <section
        className="message-window"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="messages-container">
          {messages.map((event) => {
            const content = event.getContent();
            if (content.msgtype !== 'm.text') return null;

            const senderPlatform = event.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
            const { color, icon } = platformMap[senderPlatform] || platformMap.unknown;

            return (
              <div key={event.getId()} className="message matrix-message" style={{ background: color }}>
                <div className="message-header">
                  <FontAwesomeIcon icon={icon} style={{ marginRight: '0.5rem' }} />
                  <span>{event.getSender()}</span>
                  <time className="message-time">{formatTime(event.getTs())}</time>
                </div>
                <div dangerouslySetInnerHTML={{ __html: marked.parse(content.body) }} />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-input" onSubmit={handleSubmit}>
          <div className="platform-select">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              style={{
                background: platformMap[selectedPlatform]?.color,
                color: '#fff',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontWeight: 'bold',
              }}
            >
              {Object.keys(platformMap).map((key) => (
                <option value={key} key={key}>{key}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Type a message (Shift+Enter = newline)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            style={{
              background: platformMap[selectedPlatform]?.color,
              color: '#fff',
              fontWeight: 'bold',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              marginTop: '0.5rem',
            }}
          >
            <FontAwesomeIcon icon={platformMap[selectedPlatform]?.icon || faQuestionCircle} /> Send
          </button>
        </form>
      </section>
    </div>
  );
}