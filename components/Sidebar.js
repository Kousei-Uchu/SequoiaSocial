export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <div className="nav-item active" tabIndex="0" role="link" aria-current="page">
        <div className="nav-icon" aria-hidden="true">🏠</div>
        <div className="nav-label">Home</div>
      </div>
      <div className="nav-item" tabIndex="0" role="link">
        <div className="nav-icon" aria-hidden="true">🧭</div>
        <div className="nav-label">Explore</div>
      </div>
      <div className="nav-item" tabIndex="0" role="link">
        <div className="nav-icon" aria-hidden="true">🔔</div>
        <div className="nav-label">Notifications</div>
      </div>
      <div className="nav-item" tabIndex="0" role="link">
        <div className="nav-icon" aria-hidden="true">📩</div>
        <div className="nav-label">Direct Messages</div>
      </div>
      <div className="nav-item" tabIndex="0" role="link" style={{ marginTop: 'auto' }}>
        <div className="nav-icon" aria-hidden="true">⚙️</div>
        <div className="nav-label">Settings</div>
      </div>
    </nav>
  );
}