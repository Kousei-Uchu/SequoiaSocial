'use client';

import { useEffect, useState, useRef } from 'react';
import * as sdk from 'matrix-js-sdk';
import type { ICreateRoomOpts, Preset, Visibility } from 'matrix-js-sdk/lib/matrix';
import { MatrixEvent, Room, RoomState } from 'matrix-js-sdk';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDiscord,
  faTelegram,
  faTwitter,
  faWhatsapp,
  faFacebookMessenger,
  faGoogle,
  faApple,
} from '@fortawesome/free-brands-svg-icons';
import {
  faQuestionCircle,
  faLock,
  faUnlock,
  faCog,
  faExclamationTriangle,
  faTimes,
  faUserShield,
  faPlus,
  faComment,
  faSms,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

import { initMatrixClient } from '../lib/matrixClient';

// Extended type definitions for Matrix SDK
declare module "matrix-js-sdk" {
  interface Room {
    hasEncryptionStateEvent(): boolean;
    paginate(count: number, backwards?: boolean): Promise<boolean>;
  }

  interface MatrixClient {
    isCryptoEnabled(): boolean;
    prepareToEncrypt(room: Room): Promise<void>;
    initCrypto(): Promise<void>;
    
    on(
      event: 'sync',
      callback: (state: string, prevState: string | null, data?: any) => void
    ): this;
    on(
      event: 'sync.error',
      callback: (err: Error) => void
    ): this;
    on(
      event: 'Session.logged_out',
      callback: () => void
    ): this;
    on(
      event: 'Room.timeline',
      callback: (event: MatrixEvent, room: Room, toStartOfTimeline: boolean) => void
    ): this;
    on(
      event: 'RoomState.events',
      callback: (event: MatrixEvent, state: RoomState) => void
    ): this;
  }

  interface StateEvents {
    'm.room.encryption': any;
    'm.room.name': any;
    'm.room.topic': any;
    'm.room.join_rules': any;
    'm.room.history_visibility': any;
    'm.room.guest_access': any;
    'm.room.power_levels': any;
  }

  interface AccountDataEvents {
    'com.sequoiasocial.contact_linking': any;
    'm.direct': any;
  }

  enum EventType {
    Sync = "sync",
  }
}

interface PlatformInfo {
  color: string;
  icon: any;
}

interface Contact {
  contactId: string;
  linkedRooms: Record<string, string>;
  roomObjects: Record<string, Room>;
}

const platformMap: Record<string, PlatformInfo> = {
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

  // State
  const [matrixClient, setMatrixClient] = useState<sdk.MatrixClient | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
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
  const [settingsRoom, setSettingsRoom] = useState<Room | null>(null);
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isPaginatingRef = useRef(false);
  const roomCacheRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Utility Functions
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isRoomEncrypted = (room: Room | null) => {
    if (!matrixClient || !room) return false;
    if (!room) return false;
    return room.currentState.getStateEvents('m.room.encryption')?.length > 0;
  };

  const canUserEnableEncryption = (room: Room | null) => {
    if (!matrixClient || !room) return false;
    if (!matrixClient.isCryptoEnabled()) {
      return false;
    }

    const powerLevels = room.currentState.getStateEvents('m.room.power_levels')[0]?.getContent() || {};
    const userId = matrixClient.getUserId();
    const userPower = userId ? powerLevels.users?.[userId] ?? powerLevels.users_default ?? 0 : 0;
    const requiredPower = powerLevels.events?.['m.room.encryption'] ?? 50;
    return userPower >= requiredPower && !isRoomEncrypted(room);
  };

  const updateUserPowerLevel = (userId: string, newLevel: number) => {
    setPowerLevels((prev) => {
      const users = { ...(prev.users || {}) };
      users[userId] = newLevel;
      return { ...prev, users };
    });
  };

  // Event Handlers
  const handleContactSelect = (contact: Contact) => {
    setActiveContact(contact);
    setActiveRoom(null);

    const allEvents = Object.values(contact.roomObjects)
      .flatMap((room: Room) => room.timeline || [])
      .filter((ev: MatrixEvent) => ev.getType() === 'm.room.message')
      .sort((a: MatrixEvent, b: MatrixEvent) => a.getTs() - b.getTs());

    setMessages(allEvents);
    const last = allEvents[allEvents.length - 1];
    const platform = last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room);
    setActiveContact(null);
    setMessages(room.timeline);
    const last = room.timeline[room.timeline.length - 1];
    const platform = last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
    setSelectedPlatform(platformMap[platform] ? platform : 'unknown');
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !activeRoom || isPaginatingRef.current) return;

    if (container.scrollTop < 100) {
      isPaginatingRef.current = true;
      activeRoom.paginate(20, true)
        .then(() => {
          setMessages([...activeRoom.timeline]);
        })
        .finally(() => {
          isPaginatingRef.current = false;
        });
    }
  };

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

      if (!targetRoomId) {
        throw new Error('No target room specified');
      }

      const room = matrixClient.getRoom(targetRoomId);
      if (isRoomEncrypted(room)) {
        if (!matrixClient.isCryptoEnabled()) {
          throw new Error('Cannot send to encrypted room - encryption not supported');
        }
        await matrixClient.prepareToEncrypt(room);
      }

      await matrixClient.sendTextMessage(targetRoomId, newMessage);
      setNewMessage('');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to send message:', error);
      setErrorMsg(`Failed to send message: ${error.message}`);
      if (error.message.includes('encryption')) {
        setErrorMsg(prev => `${prev} Try creating a new encrypted room.`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const enableEncryption = async (room: Room) => {
    if (!matrixClient) return;
    try {
      await matrixClient.sendStateEvent(
        room.roomId, 
        'm.room.encryption' as keyof sdk.StateEvents, 
        {
          algorithm: 'm.megolm.v1.aes-sha2',
        }
      );
      setEncryptionEnabled(true);
      setRooms([...rooms]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to enable encryption:', error);
      alert('Failed to enable encryption: ' + error.message);
    }
  };

  const saveRoomSettings = async () => {
    if (!matrixClient || !settingsRoom) return;
    setSaving(true);
    try {
      if (roomName) {
        await matrixClient.sendStateEvent(
          settingsRoom.roomId, 
          'm.room.name' as keyof sdk.StateEvents, 
          { name: roomName }
        );
      }
      if (roomTopic) {
        await matrixClient.sendStateEvent(
          settingsRoom.roomId, 
          'm.room.topic' as keyof sdk.StateEvents, 
          { topic: roomTopic }
        );
      }
      if (joinRule) {
        await matrixClient.sendStateEvent(
          settingsRoom.roomId, 
          'm.room.join_rules' as keyof sdk.StateEvents, 
          { join_rule: joinRule }
        );
      }
      if (historyVisibility) {
        await matrixClient.sendStateEvent(
          settingsRoom.roomId, 
          'm.room.history_visibility' as keyof sdk.StateEvents, 
          { history_visibility: historyVisibility }
        );
      }
      if (guestAccess) {
        await matrixClient.sendStateEvent(
          settingsRoom.roomId, 
          'm.room.guest_access' as keyof sdk.StateEvents, 
          { guest_access: guestAccess }
        );
      }
      await matrixClient.sendStateEvent(
        settingsRoom.roomId, 
        'm.room.power_levels' as keyof sdk.StateEvents, 
        powerLevels
      );

      alert('Room settings saved!');
      setSettingsOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to save room settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
    setSaving(false);
  };

  const createDMRoom = async (userId: string) => {
    if (!matrixClient) return;

    try {
      const options: ICreateRoomOpts = {
        preset: 'trusted_private_chat' as Preset,
        is_direct: true,
        invite: [userId],
        visibility: 'private' as Visibility,
        initial_state: matrixClient.isCryptoEnabled() ? [{
          type: 'm.room.encryption',
          state_key: '',
          content: {
            algorithm: 'm.megolm.v1.aes-sha2',
          },
        }] : undefined
      };

      const { room_id } = await matrixClient.createRoom(options);
      console.log('Created DM room:', room_id);

      roomCacheRef.current.add(room_id);

      setTimeout(() => {
        const room = matrixClient.getRoom(room_id);
        if (room) {
          setRooms(prev => [...prev, room]);
          setActiveRoom(room);
          setMessages(room.timeline || []);
        }
      }, 1000);

      return room_id;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to create DM:', error);
      setErrorMsg('Failed to create DM: ' + error.message);
    }
  };

  const promptForDM = () => {
    const userId = prompt('Enter Matrix User ID (e.g. @user:server.com)');
    if (userId) {
      createDMRoom(userId);
    }
  };

  const openSettings = (room: Room) => {
    setSettingsRoom(room);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    setSettingsRoom(null);
  };

  const removeContact = async (contactId: string) => {
    if (!matrixClient) return;

    try {
      const contactData = matrixClient.getAccountData('com.sequoiasocial.contact_linking' as keyof sdk.AccountDataEvents)?.getContent();
      if (!contactData) return;

      delete contactData.contacts[contactId];
      await matrixClient.setAccountData('com.sequoiasocial.contact_linking' as keyof sdk.AccountDataEvents, contactData);
      setContacts((prev) => prev.filter((c) => c.contactId !== contactId));
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg('Failed to remove contact: ' + error.message);
    }
  };

  const handleLogout = async () => {
    if (!matrixClient) return;
    try {
      await matrixClient.logout();
      router.push('/login');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg('Failed to logout: ' + error.message);
    }
  };

  // Effects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeRoom || !matrixClient) return;

    const nameEv = activeRoom.currentState.getStateEvents('m.room.name' as keyof sdk.StateEvents)[0];
    setRoomName(nameEv?.getContent()?.name || '');

    const topicEv = activeRoom.currentState.getStateEvents('m.room.topic' as keyof sdk.StateEvents)[0];
    setRoomTopic(topicEv?.getContent()?.topic || '');

    const joinRulesEv = activeRoom.currentState.getStateEvents('m.room.join_rules' as keyof sdk.StateEvents)[0];
    setJoinRule(joinRulesEv?.getContent()?.join_rule || 'invite');

    const historyVisEv = activeRoom.currentState.getStateEvents('m.room.history_visibility' as keyof sdk.StateEvents)[0];
    setHistoryVisibility(historyVisEv?.getContent()?.history_visibility || 'shared');

    const guestAccessEv = activeRoom.currentState.getStateEvents('m.room.guest_access' as keyof sdk.StateEvents)[0];
    setGuestAccess(guestAccessEv?.getContent()?.guest_access || 'forbidden');

    const encryptionEv = activeRoom.currentState.getStateEvents('m.room.encryption' as keyof sdk.StateEvents)[0];
    setEncryptionEnabled(!!encryptionEv);

    const powerLevelsEv = activeRoom.currentState.getStateEvents('m.room.power_levels' as keyof sdk.StateEvents)[0];
    if (powerLevelsEv) {
      const plContent = powerLevelsEv.getContent();
      setPowerLevels(plContent);
      const userId = matrixClient.getUserId();
      const userPL = userId ? plContent.users?.[userId] ?? plContent.users_default ?? 0 : 0;
      setUserPowerLevel(userPL);
    } else {
      setPowerLevels({});
      setUserPowerLevel(0);
    }
  }, [activeRoom, matrixClient]);

  useEffect(() => {
    const handleOnline = () => {
      if (connectionState === 'disconnected' && !loadingStates.initial) {
        initMatrixClient(abortControllerRef.current ?? undefined)
          .then(client => {
            setMatrixClient(client);
            setConnectionState('connected');
          })
          .catch(err => {
            console.error('Reconnection failed:', err);
          });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [connectionState, loadingStates.initial]);

  useEffect(() => {
    let isMounted = true;

    async function setupClient() {
      try {
        abortControllerRef.current = new AbortController();
        const client = await initMatrixClient(abortControllerRef.current);
        if (!isMounted) return;

        setMatrixClient(client);
        setLoadingStates((prev) => ({ ...prev, initial: false, olmReady: true }));

        const directMap = client.getAccountData('m.direct' as keyof sdk.AccountDataEvents)?.getContent() || {};
        const dmRoomIds = new Set(Object.values(directMap).flat());
        const dmRooms = client.getRooms().filter((r) => dmRoomIds.has(r.roomId));
        setRooms(dmRooms);

        const contactLinks = client.getAccountData('com.sequoiasocial.contact_linking' as keyof sdk.AccountDataEvents)?.getContent()?.contacts || {};
        const filteredContacts = Object.entries(contactLinks).map(([contactId, data]: [string, any]) => {
          const roomObjects: Record<string, Room> = {};
          for (const [platform, roomId] of Object.entries(data.linkedRooms || {}) as [string, string][]) {
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
              const platform = last?.getSender()?.split(':')[1]?.split('.')[0] || 'unknown';
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
                const error = err as Error;
                setRoomJoinError(`Failed to join room ${state.roomId}: ${error.message}`);
              }
            }
          }
        });

        client.startClient();
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to initialize Matrix client:', error);
        if (!isMounted) return;

        setErrorMsg('Failed to initialize Matrix client: ' + error.message);
        setLoadingStates((prev) => ({ ...prev, initial: false }));

        if (error.message.includes('authenticated')) {
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

  if (loadingStates.initial) return <div className="loading">Loading chat...</div>;

  const MarkdownMessage = ({ content }: { content: string }) => {
    const [html, setHtml] = useState('');

    useEffect(() => {
      const parseMarkdown = async () => {
        try {
          const parsed = await marked.parse(content);
          setHtml(DOMPurify.sanitize(parsed));
        } catch (err) {
          console.error('Error parsing markdown:', err);
          setHtml(DOMPurify.sanitize(content));
        }
      };

      parseMarkdown();
    }, [content]);

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

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
                onClick={() => {
                  setSettingsRoom(room);
                  setSettingsOpen(true);
                }}
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
        {isRoomEncrypted(activeRoom) && !matrixClient?.isCryptoEnabled() && (
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
                  <time className="message-time">{formatTime(new Date(event.getTs()).toISOString())}</time>
                </div>
                <MarkdownMessage content={content.body} />
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
            disabled={connectionState !== 'connected' || (isRoomEncrypted(activeRoom) && !matrixClient?.isCryptoEnabled())}
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
            disabled={connectionState !== 'connected' || (isRoomEncrypted(activeRoom) && !matrixClient?.isCryptoEnabled())}
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
                  value={roomName || 'Unnamed Room'}
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
                            value={Number(level) || 0}
                            disabled={userPowerLevel < (powerLevels.events?.['m.room.power_levels'] ?? 50)}
                            onChange={(e) => updateUserPowerLevel(userId, Number(e.target.value))}
                          />
                        </td>
                      </tr>
                    ))
                    : <tr><td colSpan={2}>No users found.</td></tr>}
                </tbody>
              </table>

              <button onClick={saveRoomSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </fieldset>
          </div>
        </div>
      )}

      <style>{`
        .main-layout {
          display: flex;
          gap: 1rem;
          height: 100%;
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