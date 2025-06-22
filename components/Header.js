export default function Header() {
  return (
    <header>
      <div className="brand">Sequoia Social</div>
      <div 
        className="user-profile" 
        tabIndex="0" 
        aria-haspopup="true" 
        aria-expanded="false" 
        aria-label="User profile menu"
      >
        <div className="avatar" aria-hidden="true">JD</div>
        <span>John Doe</span>
        <div className="profile-dropdown" role="menu" aria-label="Profile menu">
          <button role="menuitem" tabIndex="-1">Profile</button>
          <button role="menuitem" tabIndex="-1">Settings</button>
        </div>
      </div>
    </header>
  );
}