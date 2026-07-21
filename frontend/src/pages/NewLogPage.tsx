import React, { useState, useEffect } from 'react';
import type { MediaItem } from '../types/media';
import { User } from '../types';
import SearchMedia from '../components/SearchMedia';
import LogForm from '../components/LogForm';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const NewLogPage: React.FC = () => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleSelectMedia = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleLogSubmit = async (logDetails: any) => {
    if (!selectedMedia || !user) return;

    const payload = {
      log_in: {
        ...logDetails,
        media_item: selectedMedia,
      },
      user_id: user.id
    };

    try {
      await api.post('/media/logs', payload);
      navigate('/'); // Redirect to home page after successful log
    } catch (error) {
      console.error("Failed to submit log", error);
    }
  };

  return (
    <div>
      {!selectedMedia ? (
        <SearchMedia onSelectMedia={handleSelectMedia} />
      ) : (
        <div>
          <h2>Log: {selectedMedia.title}</h2>
          <LogForm
            onSubmit={handleLogSubmit}
            onCancel={() => setSelectedMedia(null)}
          />
        </div>
      )}
    </div>
  );
};

export default NewLogPage;

