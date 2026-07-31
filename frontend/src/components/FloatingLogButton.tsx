import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { MediaItem } from '../types/media';
import { getLogUrl } from '../utils';
import type { User } from '../types';
import SearchMedia from './SearchMedia';
import LogForm from './LogForm';
import api from '../services/api';

interface FloatingLogButtonProps {
  user: User;
}

const FloatingLogButton = ({ user }: FloatingLogButtonProps) => {
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setSelectedMedia(null);
  };

  const handleLogSubmit = async (logDetails: any) => {
    if (!selectedMedia) return;
    const payload = {
      log_in: { ...logDetails, media_item: selectedMedia },
      user_id: user.id,
    };
    try {
      const { data } = await api.post('/media/logs', payload);
      handleClose();
      if (data?.id) {
        navigate(getLogUrl(data.media_item));
      }
    } catch (error) {
      console.error('Failed to submit log', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'var(--accent)', color: '#000', right: 'calc(2rem + 324px)' }}
        title="Novo Log"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={handleClose}>
          <div className="mdf-card w-full max-w-2xl max-h-[85vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-display text-lg font-bold">Novo Log</h2>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedMedia ? (
                <SearchMedia onSelectMedia={setSelectedMedia} />
              ) : (
                <LogForm
                  onSubmit={handleLogSubmit}
                  onCancel={() => setSelectedMedia(null)}
                  mediaItem={selectedMedia}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FloatingLogButton;
