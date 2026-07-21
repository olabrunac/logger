import type { User } from '../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  return (
    <header>
      <nav>
        <span>Logger</span>
        {user && (
          <div>
            <span>{user.username}</span>
            <button onClick={onLogout}>Logout</button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
