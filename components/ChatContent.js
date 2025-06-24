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
import {
  faQuestionCircle,
  faLock,
  faUnlock,
  faCog,
  faExclamationTriangle,
  faTimes,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';

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

const joinRuleOptions = [
  { value: 'public', label: 'Public' },
  { value: 'invite', label: 'Invite Only' },
  { value: 'knock', label: 'Knock' },
  { value: 'private', label: 'Private' },
];

const historyVisibilityOptions = [
  { value: 'world_readable', label: 'World Readable' },
  { value: 'shared', label: 'Shared' },
  { value: 'invited', label: 'Invited' },
  { value: 'joined', label: 'Joined' },
];

const guestAccessOptions = [
  { value: 'can_join', label: 'Guests Can Join' },
  { value: 'forbidden', label: 'Guests Forbidden' },
];

export default function ChatContent() {
  const router = useRouter();

  const [matrixClient, setMatrixClient] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsRoom, setSettingsRoom] = useState(null);

  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [joinRule, setJoinRule] = useState('invite');
  const [historyVisibility, setHistoryVisibility] = useState('shared');
  const [guestAccess, setGuestAccess] = useState('forbidden');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [powerLevels, setPowerLevels] = useState({});
  const [userPowerLevel, setUserPowerLevel] = useState(0);
  const [saving, setSaving] = useState(false);

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
        await client.initCrypto();
        client.startClient();

        client.once('sync', (state) => {
          if (state === 'PREPARED') {
            const directMap = client.getAccountData('m.direct')?.getContent() || {};
            const dmRoomIds = new Set(Object.values(directMap).flat());
            const dmRooms = client.getRooms().filter(r => dmRoomIds.has(r.roomId));
            
            const contactLinks = client.getAccountData('com.yourapp.contact_linking')?.getContent()?.contacts || {};
            const filteredContacts = Object.entries(contactLinks).map(([contactId, data]) => {
              const roomObjects = {};
              for (const [platform, roomId] of Object.entries(data.linkedRooms || {})) {
                const room = client.getRoom(roomId);
                const members = room?.getJoinedMembers() || [];
                if (room && members.length === 2 && members.some(m => m.userId === contactId)) {
                  roomObjects[platform] = room;
                }
              }
              return { contactId, linkedRooms: data.linkedRooms, roomObjects };
            });

            setRooms(dmRooms);
            setContacts(filteredContacts);
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

  useEffect(() => {
    if (!activeRoom || !matrixClient) return;

    const nameEv = activeRoom.currentState.getStateEvents('m.room.name')[0];
    setRoomName(nameEv?.getContent()?.name || '');

    const topicEv = activeRoom.currentState.getStateEvents('m.room.topic')[0];
    setRoomTopic(topicEv?.getContent()?.topic || '');

    const joinRulesEv = activeRoom.currentState.getStateEvents('m.room.join_rules')[0];
    setJoinRule(joinRulesEv?.getContent()?.join_rule || 'invite');

    const historyVisEv = activeRoom.currentState.getStateEvents('m.room.history_visibility')[0];
    setHistoryVisibility(historyVisEv?.getContent()?.history_visibility || 'shared');

    const guestAccessEv = activeRoom.currentState.getStateEvents('m.room.guest_access')[0];
    setGuestAccess(guestAccessEv?.getContent()?.guest_access || 'forbidden');

    const encryptionEv = activeRoom.currentState.getStateEvents('m.room.encryption')[0];
    setEncryptionEnabled(!!encryptionEv);

    const powerLevelsEv = activeRoom.currentState.getStateEvents('m.room.power_levels')[0];
    if (powerLevelsEv) {
      const plContent = powerLevelsEv.getContent();
      setPowerLevels(plContent);
      const userPL = plContent.users?.[matrixClient.getUserId()] ?? plContent.users_default ?? 0;
      setUserPowerLevel(userPL);
    } else {
      setPowerLevels({});
      setUserPowerLevel(0);
    }
  }, [activeRoom, matrixClient]);

  const detectPlatform = (msgs) => {
    const last = [...msgs].reverse().find(e => e.getType() === 'm.room.message');
    const platform = last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  const handleContactSelect = (contact) => {
    setActiveContact(contact);
    setActiveRoom(null);

    const allEvents = Object.values(contact.roomObjects)
      .flatMap(room => room.timeline || [])
      .filter(ev => ev.getType() === 'm.room.message')
      .sort((a, b) => a.getTs() - b.getTs());

    setMessages(allEvents);
    detectPlatform(allEvents);
  };

  const handleRoomSelect = (room) => {
    setActiveRoom(room);
    setActiveContact(null);
    setMessages(room.timeline);
    detectPlatform(room.timeline);
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
    if (!newMessage.trim() || !matrixClient) return;

    try {
      let targetRoomId;
      if (activeRoom) {
        targetRoomId = activeRoom.roomId;
      } else if (activeContact) {
        targetRoomId = activeContact.linkedRooms[selectedPlatform];
      } else {
        return;
      }

      await matrixClient.sendTextMessage(targetRoomId, newMessage);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setErrorMsg('Failed to send message.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isRoomEncrypted = (room) => {
    if (!matrixClient || !room) return false;
    const ev = room.currentState.getStateEvents('m.room.encryption')[0];
    return !!ev;
  };

  const canUserEnableEncryption = (room) => {
    if (!matrixClient || !room) return false;
    const powerLevels = room.currentState.getStateEvents('m.room.power_levels')[0]?.getContent() || {};
    const userPower = powerLevels.users?.[matrixClient.getUserId()] ?? powerLevels.users_default ?? 0;
    const requiredPower = powerLevels.events?.['m.room.encryption'] ?? 50;
    return userPower >= requiredPower && !isRoomEncrypted(room);
  };

  const enableEncryption = async (room) => {
    if (!matrixClient) return;
    try {
      await matrixClient.sendStateEvent(room.roomId, 'm.room.encryption', {
        algorithm: 'm.megolm.v1.aes-sha2',
      });
      setEncryptionEnabled(true);
      setRooms([...rooms]);
    } catch (err) {
      console.error('Failed to enable encryption:', err);
      alert('Failed to enable encryption: ' + err.message);
    }
  };

  const saveRoomSettings = async () => {
    if (!matrixClient || !settingsRoom) return;
    setSaving(true);
    try {
      if (roomName) {
        await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.name', { name: roomName });
      }
      if (roomTopic) {
        await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.topic', { topic: roomTopic });
      }
      if (joinRule) {
        await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.join_rules', { join_rule: joinRule });
      }
      if (historyVisibility) {
        await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.history_visibility', {
          history_visibility: historyVisibility,
        });
      }
      if (guestAccess) {
        await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.guest_access', { guest_access: guestAccess });
      }
      await matrixClient.sendStateEvent(settingsRoom.roomId, 'm.room.power_levels', powerLevels);

      alert('Room settings saved!');
      setSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save room settings:', err);
      alert('Failed to save settings: ' + err.message);
    }
    setSaving(false);
  };

  const updateUserPowerLevel = (userId, newLevel) => {
    setPowerLevels((prev) => {
      const users = { ...(prev.users || {}) };
      users[userId] = newLevel;
      return { ...prev, users };
    });
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
        
        <h4>📩 Direct Messages</h4>
        {rooms.map((room) => {
          const encrypted = isRoomEncrypted(room);
          return (
            <div
              key={room.roomId}
              className={`channel-item ${activeRoom?.roomId === room.roomId ? 'active' : ''}`}
            >
              <div
                onClick={() => handleRoomSelect(room)}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <div className="channel-icon">#</div>
                <span>{room.name || room.roomId}</span>
                <FontAwesomeIcon
                  icon={encrypted ? faLock : faUnlock}
                  title={encrypted ? 'Encrypted' : 'Not encrypted'}
                  style={{ marginLeft: 8, color: encrypted ? '#4caf50' : '#f44336' }}
                />
              </div>
              <button
                aria-label={`Settings for ${room.name || room.roomId}`}
                className="settings-button"
                onClick={() => setSettingsRoom(room) || setSettingsOpen(true)}
              >
                <FontAwesomeIcon icon={faCog} />
              </button>
            </div>
          );
        })}

        <h4>👥 Contacts</h4>
        {contacts.map((contact) => (
          <div
            key={contact.contactId}
            className={`channel-item ${activeContact?.contactId === contact.contactId ? 'active' : ''}`}
            onClick={() => handleContactSelect(contact)}
          >
            <span>{contact.contactId}</span>
          </div>
        ))}
      </section>

      <section className="message-window" ref={messagesContainerRef} onScroll={handleScroll}>
        {activeRoom && !isRoomEncrypted(activeRoom) && canUserEnableEncryption(activeRoom) && (
          <div className="encryption-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} /> This room is not encrypted.{' '}
            <button onClick={() => enableEncryption(activeRoom)}>Enable Encryption</button>
          </div>
        )}

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
          {activeContact && (
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
                {Object.keys(activeContact?.linkedRooms || {}).map((key) => (
                  <option value={key} key={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          )}
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

      {settingsOpen && settingsRoom && (
        <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="settings-content">
            <h2 id="settings-title">Settings for {settingsRoom.name || settingsRoom.roomId}</h2>
            <button className="close-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <fieldset disabled={saving}>
              <label>
                Room Name:
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={255}
                />
              </label>

              <label>
                Room Topic:
                <textarea
                  value={roomTopic}
                  onChange={(e) => setRoomTopic(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </label>

              <label>
                Join Rule:
                <select value={joinRule} onChange={(e) => setJoinRule(e.target.value)}>
                  {joinRuleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                History Visibility:
                <select value={historyVisibility} onChange={(e) => setHistoryVisibility(e.target.value)}>
                  {historyVisibilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Guest Access:
                <select value={guestAccess} onChange={(e) => setGuestAccess(e.target.value)}>
                  {guestAccessOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <p>
                Encryption:{' '}
                {encryptionEnabled ? (
                  <FontAwesomeIcon icon={faLock} style={{ color: '#4caf50' }} title="Encrypted" />
                ) : (
                  <FontAwesomeIcon icon={faUnlock} style={{ color: '#f44336' }} title="Not encrypted" />
                )}
              </p>

              <h3>
                <FontAwesomeIcon icon={faUserShield} /> Power Levels
              </h3>
              <table className="power-levels-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Power Level</th>
                  </tr>
                </thead>
                <tbody>
                  {powerLevels.users
                    ? Object.entries(powerLevels.users).map(([userId, level]) => (
                        <tr key={userId}>
                          <td>{userId}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={level}
                              disabled={userPowerLevel < (powerLevels.events?.['m.room.power_levels'] ?? 50)}
                              onChange={(e) => updateUserPowerLevel(userId, Number(e.target.value))}
                            />
                          </td>
                        </tr>
                      ))
                    : 'No users found.'}
                </tbody>
              </table>

              <button onClick={saveRoomSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </fieldset>
          </div>
        </div>
      )}

      <style jsx>{`
        .main-layout {
          display: flex;
          gap: 1rem;
          height: 100vh;
          color: white;
          background: #121212;
        }
        
        .channel-list {
          width: 260px;
          background: #1e1e1e;
          padding: 1rem;
          overflow-y: auto;
          user-select: none;
        }
        
        .channel-item {
          padding: 0.5rem;
          margin-bottom: 0.25rem;
          background: #2c2c2c;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.3s ease;
        }
        
        .channel-item:hover {
          background: #3a3a3a;
        }
        
        .channel-item.active {
          background: #444;
          font-weight: bold;
        }
        
        .channel-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          margin-right: 8px;
          background: #555;
          border-radius: 4px;
        }
        
        .search-bar input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          margin-bottom: 1rem;
          border-radius: 6px;
          border: none;
          background: #2a2a2a;
          color: white;
          font-size: 1rem;
        }
        
        .message-window {
          flex: 1;
          background: #121212;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          overflow-y: hidden;
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding-right: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #555 transparent;
        }
        
        .messages-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
          background-color: #555;
          border-radius: 4px;
        }
        
        .message {
          margin-bottom: 1rem;
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: white;
          word-wrap: break-word;
        }
        
        .message-header {
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .message-time {
          margin-left: auto;
          font-size: 0.75rem;
          opacity: 0.6;
          user-select: none;
        }
        
        .message-input {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
        }
        
        .message-input textarea {
          padding: 0.5rem;
          border-radius: 6px;
          background: #2a2a2a;
          color: white;
          min-height: 4rem;
          resize: vertical;
          border: none;
          font-size: 1rem;
          font-family: inherit;
        }
        
        .platform-select {
          margin-bottom: 0.5rem;
        }
        
        .platform-select select {
          width: 150px;
          font-weight: bold;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          color: white;
          background-image: linear-gradient(135deg, #444, #222);
          transition: background-image 0.3s ease;
        }
        
        button[type='submit'] {
          font-weight: bold;
          border: none;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        
        button[type='submit']:hover {
          filter: brightness(110%);
        }
        
        .settings-button {
          background: none;
          border: none;
          color: #bbb;
          cursor: pointer;
          margin-left: 8px;
          font-size: 1.1rem;
          padding: 0 4px;
        }
        
        .settings-button:hover {
          color: #fff;
        }
        
        .encryption-warning {
          background: #442222;
          color: #fbb;
          padding: 0.5rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: bold;
        }
        
        .settings-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .settings-content {
          background: #1e1e1e;
          padding: 2rem;
          border-radius: 8px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        
        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          color: #bbb;
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .settings-content label {
          display: block;
          margin-bottom: 1rem;
          font-weight: bold;
          color: white;
        }
        
        .settings-content input[type='text'],
        .settings-content textarea,
        .settings-content select {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.25rem;
          border-radius: 4px;
          border: 1px solid #555;
          background: #2a2a2a;
          color: white;
          font-size: 1rem;
        }
        
        .power-levels-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
          color: white;
        }
        
        .power-levels-table th,
        .power-levels-table td {
          border: 1px solid #555;
          padding: 0.5rem;
          text-align: left;
        }
        
        .power-levels-table input[type='number'] {
          width: 4rem;
          background: #444;
          border: none;
          border-radius: 3px;
          color: white;
          padding: 0.25rem;
        }
      `}</style>
    </div>
  );
}