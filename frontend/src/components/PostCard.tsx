import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { User } from '../types';
import type { Post, PostReply } from '../types/feed';
import { PostImages } from './PostImages';
import HashtagText from './HashtagText';
import { Send, Trash2, MessageCircle, ThumbsUp, Pencil, Check, X } from 'lucide-react';
import { imageUrl, timeAgo } from '../utils';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onReply: (postId: number, content: string) => Promise<void>;
  onDelete: (postId: number) => void;
  onLike: (postId: number) => void;
  onEdit: (postId: number, content: string) => Promise<void>;
}

const IMAGE_URL = (url: string) => imageUrl(url) || '';

const PostCard = ({ post, currentUser, onReply, onDelete, onLike, onEdit }: PostCardProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<PostReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/posts/posts/${post.id}/replies`);
      setReplies(res.data);
    } catch {}
    setLoadingReplies(false);
  };

  const toggleReplies = () => {
    if (!showReplies) loadReplies();
    setShowReplies(!showReplies);
  };

  const handleReply = async () => {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    await onReply(post.id, replyText.trim());
    setReplyText('');
    await loadReplies();
    setSendingReply(false);
  };

  const startEdit = () => {
    setEditText(post.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    await onEdit(post.id, editText.trim());
    setIsEditing(false);
    setSavingEdit(false);
  };

  const getAvatar = (url?: string) => url ? IMAGE_URL(url) : null;

  return (
    <div className="mdf-card rounded-xl overflow-hidden">
      <div className="p-4 pb-3 flex items-start gap-3">
        <Link to={`/profile/${post.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {getAvatar(post.avatar_url) ? (
              <img src={getAvatar(post.avatar_url)!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                {post.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${post.username}`} className="text-sm font-bold text-white hover:underline">{post.username}</Link>
            <span className="text-sm text-white/30">{timeAgo(post.created_at)}</span>
            {post.user_id === currentUser.id && (
              <div className="ml-auto flex items-center gap-0.5">
                <button onClick={startEdit} className="p-1 text-white/20 hover:text-white/70 transition-colors" title="Editar post">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(post.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors" title="Excluir post">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-1">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, 280))}
                rows={3}
                className="w-full bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--accent)] outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 resize-none transition-colors"
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="text-sm text-right" style={{ color: editText.length > 260 ? '#f87171' : 'var(--text-dim)' }}>
                  {editText.length}/280
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors" disabled={savingEdit}>
                    <X size={12} /> Cancelar
                  </button>
                  <button onClick={saveEdit} disabled={!editText.trim() || savingEdit} className="flex items-center gap-1 text-sm mdf-btn-primary disabled:opacity-30">
                    <Check size={12} /> {savingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap break-words"><HashtagText text={post.content} /></p>
          )}
        </div>
      </div>

      {post.images.length > 0 && (
        <PostImages images={post.images} />
      )}

      <div className="px-4 py-2 flex items-center gap-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggleReplies} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
          <MessageCircle size={14} />
          {post.replies_count > 0 ? `${post.replies_count} resposta${post.replies_count > 1 ? 's' : ''}` : 'Responder'}
        </button>
        <button onClick={() => onLike(post.id)} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: post.is_liked ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>
          <ThumbsUp size={14} fill={post.is_liked ? 'currentColor' : 'none'} />
          {post.likes_count > 0 ? post.likes_count : 'Curtir'}
        </button>
      </div>

      {post.likes_count > 0 && post.liked_by && post.liked_by.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex -space-x-1.5">
            {post.liked_by.slice(0, 5).map((liker) => (
              <Link key={liker.username} to={`/profile/${liker.username}`} className="relative block">
                <div className="w-5 h-5 rounded-full overflow-hidden border" style={{ borderColor: 'var(--mdf-bg)' }}>
                  {getAvatar(liker.avatar_url) ? (
                    <img src={getAvatar(liker.avatar_url)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                      {liker.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <span className="text-sm text-white/30">
            {post.likes_count === 1
              ? `${post.liked_by[0].username} curtiu`
              : post.liked_by.length <= post.likes_count && post.liked_by.length <= 5
                ? `${post.liked_by.map(l => l.username).join(', ')}${post.likes_count > post.liked_by.length ? ` e mais ${post.likes_count - post.liked_by.length}` : ''} curtiram`
                : `${post.likes_count} curtidas`
            }
          </span>
        </div>
      )}

      {showReplies && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {loadingReplies ? (
            <div className="p-4 text-sm text-white/30 text-center">Carregando...</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {replies.map(reply => (
                <div key={reply.id} className="px-4 py-3 flex gap-2.5">
                  <Link to={`/profile/${reply.username}`} className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden">
                      {getAvatar(reply.avatar_url) ? (
                        <img src={getAvatar(reply.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                          {reply.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/profile/${reply.username}`} className="text-sm font-bold text-white hover:underline">{reply.username}</Link>
                      <span className="text-sm text-white/25">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-white/70 mt-0.5 whitespace-pre-wrap break-words"><HashtagText text={reply.content} /></p>
                  </div>
                </div>
              ))}
              {replies.length === 0 && (
                <div className="p-4 text-sm text-white/30 text-center">Nenhuma resposta ainda</div>
              )}
            </div>
          )}

          <div className="px-4 py-3 flex gap-2 items-end border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              {getAvatar(currentUser.avatar_url) ? (
                <img src={getAvatar(currentUser.avatar_url)!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--accent)', color: '#000' }}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value.slice(0, 280))}
              placeholder="Responda..."
              rows={1}
              className="flex-1 bg-[var(--mdf-surface)] border border-white/10 focus:border-[var(--accent)] outline-none rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 resize-none transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || sendingReply}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: 'var(--accent)' }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
