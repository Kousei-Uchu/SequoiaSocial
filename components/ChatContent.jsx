'use client';

import { useEffect, useState, useRef } from 'react';
import * as sdk from 'matrix-js-sdk';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { initMatrixClient } from '../lib/matrixClient';

const platformMap = {
  discord: { color: 'linear-gradient(135deg, #7289da, #5865f2)' },
  telegram: { color: 'linear-gradient(135deg, #2ca5e0, #0088cc)' },
  twitter: { color: 'linear-gradient(135deg, #1DA1F2, #0d8ddb)' },
  whatsapp: { color: 'linear-gradient(135deg, #25d366, #128c7e)' },
  messenger: { color: 'linear-gradient(135deg, #00b2ff, #006aff)' },
  google: { color: 'linear-gradient(135deg, #34a853, #4285f4)' },
  imessage: { color: 'linear-gradient(135deg, #1db954, #007aff)' },
  sms: { color: 'linear-gradient(135deg, #444, #999)' },
  unknown: { color: 'linear-gradient(135deg, #888, #555)' },
};

export default function ChatContent() {
  const router = useRouter();

  // --- State ---
  const [matrixClient, setMatrixClient] = useState<sdk.MatrixClient | null>(null);
  const [rooms, setRooms] = useState<sdk.Room[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<sdk.Room | null>(null);
  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<sdk.MatrixEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('unknown');
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    messages: false,
    encryption: false,
    cryptoInit: false,
    olmReady: false,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsRoom, setSettingsRoom] = useState<sdk.Room | null>(null);
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [joinRule, setJoinRule] = useState('invite');
  const [historyVisibility, setHistoryVisibility] = useState('shared');
  const [guestAccess, setGuestAccess] = useState('forbidden');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [powerLevels, setPowerLevels] = useState<any>({});
  const [userPowerLevel, setUserPowerLevel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isPaginatingRef = useRef(false);
  const roomCacheRef = useRef(new Set<string>());
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // --- Effects ---

  // Initialize Matrix client once on mount
  useEffect(() => {
    let isMounted = true;

    async function setupClient() {
      try {
        abortControllerRef.current = new AbortController();
        const client = await initMatrixClient(abortControllerRef.current);
        if (!isMounted) return;

        setMatrixClient(client);
        setLoadingStates((prev) => ({ ...prev, initial: false, olmReady: true }));

        // Load DM rooms and contacts from account data
        const directMap = client.getAccountData('m.direct')?.getContent() || {};
        const dmRoomIds = new Set(Object.values(directMap).flat());
        const dmRooms = client.getRooms().filter((r) => dmRoomIds.has(r.roomId));
        setRooms(dmRooms);

        const contactLinks =
          client.getAccountData('com.sequoiasocial.contact_linking')?.getContent()?.contacts || {};
        const filteredContacts = Object.entries(contactLinks).map(([contactId, data]: any) => {
          const roomObjects: Record<string, sdk.Room> = {};
          for (const [platform, roomId] of Object.entries(data.linkedRooms || {})) {
            const room = client.getRoom(roomId);
            const members = room?.getJoinedMembers() || [];
            if (room && members.length === 2 && members.some((m) => m.userId === contactId)) {
              roomObjects[platform] = room;
            }
          }
          return { contactId, linkedRooms: data.linkedRooms, roomObjects };
        });
        setContacts(filteredContacts);

        if (dmRooms.length > 0) {
          setActiveRoom(dmRooms[0]);
          setMessages(dmRooms[0].timeline || []);
        }

        setConnectionState('connected');

        // Setup Matrix event listeners

        client.on('sync', (state) => {
          if (state === 'PREPARED') {
            setConnectionState('connected');
            retryCountRef.current = 0;
          } else if (state === 'ERROR') {
            setConnectionState('disconnected');
          } else if (state === 'RECONNECTING') {
            setConnectionState('reconnecting');
          }
        });

        client.on('sync.error', (err) => {
          console.error('Sync error:', err);
          setErrorMsg(`Connection issue: ${err.message}`);
          setConnectionState('disconnected');
          // Could add retry logic here if desired
        });

        client.on('Session.logged_out', () => {
          if (isMounted) setErrorMsg('Session logged out');
        });

        client.on('Room.timeline', (event, room, toStartOfTimeline) => {
          if (toStartOfTimeline) return;
          if (event.getType() !== 'm.room.message') return;

          setMessages((prev) => {
            if (prev.some((m) => m.getId() === event.getId())) return prev;
            return [...prev, event];
          });

          if (room?.roomId === activeRoom?.roomId) {
            setTimeout(() => {
              const last = [...messages, event]
                .slice()
                .reverse()
                .find((e) => e.getType() === 'm.room.message');
              const platform =
                last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
              setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
            }, 0);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        });

        client.on('RoomState.events', async (event, state) => {
          if (!client.getRoom(state.roomId)) {
            if (!roomCacheRef.current.has(state.roomId)) {
              roomCacheRef.current.add(state.roomId);
              try {
                let room = client.getRoom(state.roomId);
                if (!room) {
                  room = await client.joinRoom(state.roomId);
                }
                if (room && !rooms.some((r) => r.roomId === state.roomId)) {
                  setRooms((prev) => [...prev, room]);
                  if (!activeRoom) {
                    setActiveRoom(room);
                    setMessages(room.timeline || []);
                  }
                }
              } catch (err) {
                setRoomJoinError(`Failed to join room ${state.roomId}: ${err.message}`);
              }
            }
          }
        });

        client.startClient();
      } catch (err: any) {
        console.error('Failed to initialize Matrix client:', err);
        if (!isMounted) return;

        setErrorMsg('Failed to initialize Matrix client: ' + err.message);
        setLoadingStates((prev) => ({ ...prev, initial: false }));

        if (err.message.includes('authenticated')) {
          router.push('/login');
        }
      }
    }

    setupClient();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (matrixClient) {
        matrixClient.stopClient();
        matrixClient.removeAllListeners();
      }
    };
  }, [router]);

  // Update room settings state when activeRoom or client changes
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
      const userPL =
        plContent.users?.[matrixClient.getUserId()] ??
        plContent.users_default ??
        0;
      setUserPowerLevel(userPL);
    } else {
      setPowerLevels({});
      setUserPowerLevel(0);
    }
  }, [activeRoom, matrixClient]);

  // --- Handlers ---

  // Select a contact: update active contact, reset room, show combined messages from linked rooms
  const handleContactSelect = (contact: any) => {
    setActiveContact(contact);
    setActiveRoom(null);

    const allEvents = Object.values(contact.roomObjects)
      .flatMap((room: sdk.Room) => room.timeline || [])
      .filter((ev: sdk.MatrixEvent) => ev.getType() === 'm.room.message')
      .sort((a: sdk.MatrixEvent, b: sdk.MatrixEvent) => a.getTs() - b.getTs());

    setMessages(allEvents);
    const last = allEvents[allEvents.length - 1];
    const platform =
      last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  // Select a room: update active room and reset active contact, set messages and platform
  const handleRoomSelect = (room: sdk.Room) => {
    setActiveRoom(room);
    setActiveContact(null);
    setMessages(room.timeline);
    const last = room.timeline[room.timeline.length - 1];
    const platform =
      last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  // Scroll handler for pagination on scroll up near top
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !activeRoom || isPaginatingRef.current) return;

    if (container.scrollTop < 100) {
      isPaginatingRef.current = true;
      activeRoom
        .paginate(20, true)
        .then(() => {
          setMessages([...activeRoom.timeline]);
        })
        .finally(() => {
          isPaginatingRef.current = false;
        });
    }
  };

  // Send message handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matrixClient) return;

    try {
      let targetRoomId: string | undefined;
      if (activeRoom) {
        targetRoomId = activeRoom.roomId;
      } else if (activeContact) {
        targetRoomId = activeContact.linkedRooms[selectedPlatform];
      } else {
        return;
      }

      const room = matrixClient.getRoom(targetRoomId);
      if (room?.hasEncryptionStateEvent?.()) {
        if (!matrixClient.isCryptoEnabled?.()) {
          throw new Error('Encryption is not enabled.');
        }
      }

      await matrixClient.sendTextMessage(targetRoomId, newMessage.trim());
      setNewMessage('');
    } catch (err: any) {
      setErrorMsg('Failed to send message: ' + err.message);
    }
  };

  // Enable encryption for current room
  const enableEncryption = async () => {
    if (!activeRoom || !matrixClient) return;
    setLoadingStates((prev) => ({ ...prev, encryption: true }));

    try {
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.encryption',
        { algorithm: 'm.megolm.v1.aes-sha2' },
        '',
      );
      setEncryptionEnabled(true);
    } catch (err: any) {
      setErrorMsg('Failed to enable encryption: ' + err.message);
    } finally {
      setLoadingStates((prev) => ({ ...prev, encryption: false }));
    }
  };

  // Save room settings: name, topic, join rules, history visibility, guest access
  const saveRoomSettings = async () => {
    if (!activeRoom || !matrixClient) return;

    setSaving(true);
    try {
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.name',
        { name: roomName },
        '',
      );
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.topic',
        { topic: roomTopic },
        '',
      );
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.join_rules',
        { join_rule: joinRule },
        '',
      );
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.history_visibility',
        { history_visibility: historyVisibility },
        '',
      );
      await matrixClient.sendStateEvent(
        activeRoom.roomId,
        'm.room.guest_access',
        { guest_access: guestAccess },
        '',
      );
    } catch (err: any) {
      setErrorMsg('Failed to save room settings: ' + err.message);
    } finally {
      setSaving(false);
      setSettingsOpen(false);
    }
  };

  // Create a new DM room with a userId
  const createDMRoom = async (userId: string) => {
    if (!matrixClient) return;

    try {
      const roomId = await matrixClient.createRoom({
        invite: [userId],
        is_direct: true,
      });

      const newRoom = matrixClient.getRoom(roomId);
      if (newRoom) {
        setRooms((prev) => [...prev, newRoom]);
        setActiveRoom(newRoom);
        setMessages(newRoom.timeline);
      }
    } catch (err: any) {
      setErrorMsg('Failed to create DM room: ' + err.message);
    }
  };

  // Remove contact handler
  const removeContact = async (contactId: string) => {
    if (!matrixClient) return;

    try {
      // Example: update the account data to remove the contact
      const contactData = matrixClient.getAccountData('com.sequoiasocial.contact_linking')?.getContent();
      if (!contactData) return;

      delete contactData.contacts[contactId];
      await matrixClient.setAccountData('com.sequoiasocial.contact_linking', contactData);
      setContacts((prev) => prev.filter((c) => c.contactId !== contactId));
    } catch (err: any) {
      setErrorMsg('Failed to remove contact: ' + err.message);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (!matrixClient) return;
    try {
      await matrixClient.logout();
      router.push('/login');
    } catch (err: any) {
      setErrorMsg('Failed to logout: ' + err.message);
    }
  };

  // Utility: sanitize and render markdown to HTML
  const renderMarkdown = (text: string) => {
    const raw = marked(text);
    return DOMPurify.sanitize(raw);
  };

  // Scroll messages to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="main-layout">
      {/* Error banners */}
      {errorMsg && (
        <div className="error-banner">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{errorMsg}</span>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}

      {!window.Olm && (
        <div className="warning-banner">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>Encryption unavailable - some features disabled</span>
        </div>
      )}

      <section className="channel-list">
        <div className="search-bar">
          <input type="text" placeholder="Search DMs..." />
        </div>

        <button
          onClick={() => promptForDM()}
          className="new-dm-button"
        >
          <FontAwesomeIcon icon={faPlus} /> New DM
        </button>

        <div className="connection-status">
          <div className={`status-dot ${connectionState}`}></div>
          <span>
            {connectionState === 'connected' ? 'Connected' :
             connectionState === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
          </span>
          {connectionState !== 'connected' && (
            <button
              className="retry-button"
              onClick={() => {
                if (matrixClient) {
                  matrixClient.startClient();
                  setConnectionState('reconnecting');
                }
              }}
            >
              Retry
            </button>
          )}
        </div>

        <div className="crypto-panel">
          <h4>Encryption Status</h4>
          <CryptoStatus />
          {!window.Olm && (
            <div className="crypto-help">
              <p>To enable encryption:</p>
              <ol>
                <li>Ensure your browser supports WebAssembly</li>
                <li>Check your network connection</li>
                <li>Refresh the page to retry</li>
              </ol>
            </div>
          )}
        </div>

        {roomJoinError && (
          <div className="error-message">
            {roomJoinError}
          </div>
        )}

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
        {activeRoom?.hasEncryptionStateEvent?.() && !matrixClient?.isCryptoEnabled?.() && (
          <div className="encryption-error">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            Warning: This room is encrypted but your client doesn't support encryption.
            Messages cannot be sent or read.
          </div>
        )}

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
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content.body)) }} />
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
            disabled={connectionState !== 'connected' || (activeRoom?.hasEncryptionStateEvent?.() && !matrixClient?.isCryptoEnabled?.())}
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
            disabled={connectionState !== 'connected' || (activeRoom?.hasEncryptionStateEvent?.() && !matrixClient?.isCryptoEnabled?.())}
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
        
        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .message {
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          max-width: 80%;
          word-wrap: break-word;
          position: relative;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        .message-time {
          margin-left: auto;
          opacity: 0.7;
          font-size: 0.8rem;
        }
        
        .message-input {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
        }
        
        .message-input textarea {
          width: 100%;
          min-height: 60px;
          padding: 0.75rem;
          border-radius: 8px;
          border: none;
          background: #2a2a2a;
          color: white;
          resize: vertical;
          font-size: 1rem;
        }
        
        .message-input button {
          align-self: flex-end;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .message-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .platform-select {
          margin-bottom: 0.5rem;
        }
        
        .platform-select select {
          border: none;
          cursor: pointer;
        }
        
        .new-dm-button {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .new-dm-button:hover {
          background: #3e8e41;
        }
        
        .settings-button {
          background: transparent;
          border: none;
          color: #aaa;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
        }
        
        .settings-button:hover {
          color: white;
          background: #444;
        }
        
        .settings-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .settings-content {
          background: #1e1e1e;
          padding: 1.5rem;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        
        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #aaa;
          font-size: 1.2rem;
          cursor: pointer;
        }
        
        .close-button:hover {
          color: white;
        }
        
        fieldset {
          border: 1px solid #444;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 1rem;
        }
        
        input[type="text"],
        textarea,
        select {
          width: 100%;
          padding: 0.5rem;
          margin-top: 0.25rem;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 4px;
          color: white;
        }
        
        .power-levels-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .power-levels-table th,
        .power-levels-table td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid #444;
        }
        
        .power-levels-table input {
          width: 60px;
        }
        
        .encryption-error,
        .encryption-warning {
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .encryption-error {
          background: #d32f2f;
        }
        
        .encryption-warning {
          background: #ff9800;
          color: #000;
        }
        
        .encryption-warning button {
          margin-left: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-size: 1.2rem;
        }
        
        .error-message {
          padding: 1rem;
          background: #d32f2f;
          border-radius: 6px;
          margin: 1rem;
          text-align: center;
        }
        
        .crypto-panel {
          padding: 0.75rem;
          margin: 1rem 0;
          background: #2a2a2a;
          border-radius: 6px;
        }
        
        .crypto-status-good {
          color: #4caf50;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .crypto-status-bad {
          color: #f44336;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .crypto-status-loading {
          color: #ff9800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .crypto-help {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #aaa;
        }

        .crypto-help ol {
          padding-left: 1rem;
          margin-top: 0.5rem;
        }

        .crypto-help li {
          margin-bottom: 0.25rem;
        }

        /* New styles for connection status */
        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 4px;
          margin: 0.5rem 0;
          background: #2a2a2a;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #4CAF50;
          box-shadow: 0 0 5px #4CAF50;
        }

        .status-dot.reconnecting {
          background: #FFC107;
          box-shadow: 0 0 5px #FFC107;
          animation: pulse 1.5s infinite;
        }

        .status-dot.disconnected {
          background: #F44336;
          box-shadow: 0 0 5px #F44336;
        }

        .retry-button {
          margin-left: auto;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .retry-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Error and warning banners */
        .error-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #d32f2f;
          color: white;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          z-index: 1001;
        }

        .error-banner button {
          margin-left: 1rem;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .warning-banner {
          position: fixed;
          top: 40px;
          left: 0;
          right: 0;
          background: #ff9800;
          color: #000;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          z-index: 1000;
        }
        
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column;
            height: auto;
          }
          
          .channel-list {
            width: 100%;
            height: auto;
            max-height: 300px;
          }
          
          .message-window {
            height: 60vh;
          }

          .error-banner,
          .warning-banner {
            position: static;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}