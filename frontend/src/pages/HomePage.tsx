import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { User, LogEntry } from '../types';
import api from '../services/api';

interface HomePageProps {
  user: User;
}

const HomePage = ({ user }: HomePageProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // In a real app, the user ID would be inferred from the auth token on the backend
        const response = await api.get('/media/logs', { params: { user_id: user.id }});
        setLogs(response.data);
      } catch (error) {
        console.error("Failed to fetch logs", error);
      }
    };

    fetchLogs();
  }, [user]);

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <Link to="/new-log">
        <button>Log a New Entry</button>
      </Link>
      <h2>Your Logs</h2>
      <div>
        {logs.length > 0 ? (
          <ul>
            {logs.map((log) => (
              <li key={log.id}>{log.media_item.title} - {log.status}</li>
            ))}
          </ul>
        ) : (
          <p>You haven't logged anything yet.</p>
        )}
      </div>
    </div>
  );
};

export default HomePage;

