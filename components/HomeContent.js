'use client';

import { useEffect, useState } from 'react';

export default function HomeContent() {
  const [affirmation, setAffirmation] = useState("You are capable, worthy, and valued just as you are.");
  const [expandedGroup, setExpandedGroup] = useState(null);

  useEffect(() => {
    fetch('affirmation-storage/affirmation.json')
      .then(response => {
        if (!response.ok) throw new Error("Failed to load affirmation");
        return response.json();
      })
      .then(data => setAffirmation(data.affirmation))
      .catch(error => {
        console.error(error);
        setAffirmation("Couldn't load affirmation.");
      });
  }, []);

  const toggleGroup = (groupName) => {
    setExpandedGroup(expandedGroup === groupName ? null : groupName);
  };

  const handleNotificationClick = (message) => {
    alert(`Opening message: "${message}"`);
  };

  return (
    <div className="home-content" role="main" tabIndex="0" aria-label="Home dashboard">
      <section className="home-section">
        <h2>🌟 Affirmation of the Day</h2>
        <p className="affirmations" id="daily-affirmation">{affirmation}</p>
      </section>

      <section className="home-section notifications" aria-live="polite">
        <h2>🔔 New Notifications</h2>

        <div 
          className={`notification-group ${expandedGroup === 'server' ? 'expanded' : ''}`} 
          tabIndex="0" 
          role="button" 
          aria-expanded={expandedGroup === 'server'}
          onClick={() => toggleGroup('server')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleGroup('server')}
        >
          <div className="notification-header">
            <strong>Server Channels</strong>
            <span className="notification-summary">3 new mentions across your channels</span>
          </div>
          <ul className={`notification-list ${expandedGroup === 'server' ? 'expanded' : ''}`}>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("1 mention in #general")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("1 mention in #general")}
            >
              1 mention in #general
            </li>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("2 mentions in #random")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("2 mentions in #random")}
            >
              2 mentions in #random
            </li>
          </ul>
        </div>

        <div 
          className={`notification-group ${expandedGroup === 'dms' ? 'expanded' : ''}`} 
          tabIndex="0" 
          role="button" 
          aria-expanded={expandedGroup === 'dms'}
          onClick={() => toggleGroup('dms')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleGroup('dms')}
        >
          <div className="notification-header">
            <strong>Direct Messages</strong>
            <span className="notification-summary">3 new messages from your contacts</span>
          </div>
          <ul className={`notification-list ${expandedGroup === 'dms' ? 'expanded' : ''}`}>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("2 new direct messages from Alice Smith")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("2 new direct messages from Alice Smith")}
            >
              2 new direct messages from Alice Smith
            </li>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("1 new direct message from Bob Johnson")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("1 new direct message from Bob Johnson")}
            >
              1 new direct message from Bob Johnson
            </li>
          </ul>
        </div>

        <div 
          className={`notification-group ${expandedGroup === 'system' ? 'expanded' : ''}`} 
          tabIndex="0" 
          role="button" 
          aria-expanded={expandedGroup === 'system'}
          onClick={() => toggleGroup('system')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleGroup('system')}
        >
          <div className="notification-header">
            <strong>System Updates</strong>
            <span className="notification-summary">2 recent system updates available</span>
          </div>
          <ul className={`notification-list ${expandedGroup === 'system' ? 'expanded' : ''}`}>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("Version 1.2 released with new features")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("Version 1.2 released with new features")}
            >
              Version 1.2 released with new features
            </li>
            <li 
              tabIndex="0" 
              role="link"
              onClick={() => handleNotificationClick("Scheduled maintenance on June 25")}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNotificationClick("Scheduled maintenance on June 25")}
            >
              Scheduled maintenance on June 25
            </li>
          </ul>
        </div>
      </section>

      <section className="home-section">
        <h2>👥 Online Friends</h2>
        <div className="online-friends" aria-label="List of online friends">
          {['Alice Smith', 'Bob Johnson', 'Carol Lee', 'David Kim'].map(friend => (
            <div key={friend} className="friend" tabIndex="0">{friend}</div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>📝 Logged in as</h2>
        <p>John Doe (JD)</p>
      </section>
    </div>
  );
}