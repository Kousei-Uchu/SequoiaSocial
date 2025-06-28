'use client';

import { useEffect, useState } from 'react';
import * as sdk from 'matrix-js-sdk';
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
  faPlus,
  faTrash,
} from '@fortawesome/free-brands-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

const platformMap = {
  discord: { icon: faDiscord },
  telegram: { icon: faTelegram },
  twitter: { icon: faTwitter },
  whatsapp: { icon: faWhatsapp },
  messenger: { icon: faFacebookMessenger },
  google: { icon: faGoogle },
  imessage: { icon: faApple },
  sms: { icon: faSms },
  unknown: { icon: faQuestionCircle },
};

const allPlatforms = Object.keys(platformMap);

export default function ContactsContent({ matrixClient }) {
  const [contacts, setContacts] = useState({});
  const [linkedData, setLinkedData] = useState({ contacts: {} });
  const [rooms, setRooms] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!matrixClient) return;

    const directMap = matrixClient.getAccountData('m.direct')?.getContent() || {};
    const dmRoomIds = new Set(Object.values(directMap).flat());

    const dmRooms = matrixClient.getRooms().filter(r => dmRoomIds.has(r.roomId));

    setRooms(dmRooms);

    const me = matrixClient.getUserId();
    const contactsObj = {};

    dmRooms.forEach(room => {
      const members = room.getJoinedMembers().filter(m => m.userId !== me);
      if (members.length !== 1) return;

      const contactUserId = members[0].userId;
      contactsObj[contactUserId] = { userId: contactUserId, displayName: members[0].name || contactUserId };
    });

    setContacts(contactsObj);

    const linkage = matrixClient.getAccountData('com.yourapp.contact_linking')?.getContent() || { contacts: {} };
    setLinkedData(linkage);

  }, [matrixClient]);

  const saveLinkedData = async (newLinkedData) => {
    if (!matrixClient) return;
    setSaving(true);
    try {
      await matrixClient.setAccountData('com.yourapp.contact_linking', newLinkedData);
      setLinkedData(newLinkedData);
      alert('Linked rooms saved.');
    } catch (e) {
      alert('Failed to save linked rooms: ' + e.message);
    }
    setSaving(false);
  };

  const addLink = (contactId, platform, roomId) => {
    const newLinkedData = { ...linkedData };
    if (!newLinkedData.contacts[contactId]) newLinkedData.contacts[contactId] = { linkedRooms: {} };
    newLinkedData.contacts[contactId].linkedRooms[platform] = roomId;
    saveLinkedData(newLinkedData);
  };

  const removeLink = (contactId, platform) => {
    const newLinkedData = { ...linkedData };
    if (newLinkedData.contacts[contactId]) {
      delete newLinkedData.contacts[contactId].linkedRooms[platform];
      saveLinkedData(newLinkedData);
    }
  };

  const getRoomsByPlatform = (platform) => {
    return rooms.filter(room => {
      const roomName = room.name?.toLowerCase() || '';
      return roomName.includes(platform);
    });
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '100vh', color: 'white', background: '#121212', padding: '1rem' }}>
      <aside style={{ width: '300px', overflowY: 'auto', borderRight: '1px solid #444' }}>
        <h2>Contacts</h2>
        {Object.values(contacts).length === 0 && <p>No contacts found.</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {Object.values(contacts).map(contact => (
            <li
              key={contact.userId}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                backgroundColor: selectedContact?.userId === contact.userId ? '#333' : 'transparent',
              }}
              onClick={() => setSelectedContact(contact)}
            >
              {contact.displayName}
            </li>
          ))}
        </ul>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedContact && <p>Select a contact to manage linked rooms.</p>}

        {selectedContact && (
          <>
            <h2>Manage Linked Rooms for {selectedContact.displayName}</h2>

            {allPlatforms.map((platform) => {
              const linkedRoomId = linkedData.contacts?.[selectedContact.userId]?.linkedRooms?.[platform] || '';
              const platformRooms = getRoomsByPlatform(platform);

              return (
                <div key={platform} style={{ marginBottom: '1rem' }}>
                  <h3>
                    <FontAwesomeIcon icon={platformMap[platform].icon} /> {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </h3>

                  {linkedRoomId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span>Linked room ID: {linkedRoomId}</span>
                      <button onClick={() => removeLink(selectedContact.userId, platform)} disabled={saving}>
                        <FontAwesomeIcon icon={faTrash} /> Remove Link
                      </button>
                    </div>
                  ) : (
                    <div>
                      <select
                        defaultValue=""
                        onChange={(e) => addLink(selectedContact.userId, platform, e.target.value)}
                        disabled={saving || platformRooms.length === 0}
                      >
                        <option value="" disabled>
                          Select room to link
                        </option>
                        {platformRooms.length === 0 && <option disabled>No rooms found</option>}
                        {platformRooms.map((room) => (
                          <option key={room.roomId} value={room.roomId}>
                            {room.name || room.roomId}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}