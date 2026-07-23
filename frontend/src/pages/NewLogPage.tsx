import React, { useState, useEffect } from 'react';
import type { MediaItem } from '../types/media';
import type { User, LogEntry } from '../types';
import SearchMedia from '../components/SearchMedia';
import LogForm from '../components/LogForm';
import api from '../services/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const NewLogPage: React.FC = () => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (editId) {
      setLoadingEdit(true);
      api.get(`/media/logs/${editId}`)
        .then(res => {
          const log = res.data;
          setEditingLog(log);
          setSelectedMedia(log.media_item);
        })
        .catch(err => {
          console.error('Failed to load log for editing', err);
          navigate('/');
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [editId, navigate]);

  const handleSelectMedia = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleLogSubmit = async (logDetails: any) => {
    const currentUser = user ?? (() => {
      try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
      } catch { return null; }
    })();

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (editingLog) {
      const payload = {
        log_in: { ...logDetails, media_item: selectedMedia },
        user_id: currentUser.id
      };
      try {
        await api.put(`/media/logs/${editingLog.id}`, payload);
        navigate(`/log/${editingLog.id}`);
      } catch (error) {
        console.error("Failed to update log", error);
      }
    } else {
      if (!selectedMedia) return;
      const payload = {
        log_in: { ...logDetails, media_item: selectedMedia },
        user_id: currentUser.id
      };
      try {
        await api.post('/media/logs', payload);
        navigate('/');
      } catch (error) {
        console.error("Failed to submit log", error);
      }
    }
  };

  if (loadingEdit) {
    return (
      <div className="mdf-card p-8 text-center text-white/50">
        Carregando log...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedMedia ? (
        <div>
          <Link to={editingLog ? '/log/' + editingLog.id : '/'} className="mdf-btn-ghost text-sm inline-flex items-center gap-2">
            <ChevronLeft size={16} />
            {editingLog ? 'Voltar ao log' : 'Voltar'}
          </Link>
          <SearchMedia onSelectMedia={handleSelectMedia} />
        </div>
      ) : (
        <LogForm
          onSubmit={handleLogSubmit}
          onCancel={() => {
            if (editingLog) {
              navigate('/log/' + editingLog.id);
            } else {
              setSelectedMedia(null);
            }
          }}
          initialData={editingLog || undefined}
          mediaItem={selectedMedia}
          isEditing={!!editingLog}
        />
      )}
    </div>
  );
};

export default NewLogPage;
