import { useState, useRef } from 'react';
import api, { uploadFile, deleteUpload } from '../services/api';
import ImportPage from './ImportPage';
import { ImageFramingModal } from '../components/ImageFramingModal';
import RightSidebar from '../components/RightSidebar';
import LayoutPreview from '../components/LayoutPreview';
import type { User } from '../types';
import { imageUrl } from '../utils';
import { TYPE_META } from '../constants/designSystem';
import {
  User as UserIcon,
  Shield,
  Download,
  Crown,
  Settings as SettingsIcon,
  Eye,
  Trash2,
  AlertTriangle,
  Check,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  Heart,
  Star,
  Clock,
  Target,
  Medal,
  Layers,
  Menu,
  CheckCircle,
  BookOpen,
  BarChart2,
  Activity,
  MessageCircle,
  Trophy,
  SlidersHorizontal,
} from 'lucide-react';

// Per-category layout defaults
const LAYOUT_CATEGORIES = ['general', 'games', 'movies', 'series', 'books'] as const;
type LayoutCategory = (typeof LAYOUT_CATEGORIES)[number];
type LayoutDevice = 'desktop' | 'mobile' | 'sidebar';

interface LayoutSectionDef {
  id: string; label: string; icon: React.ReactNode; visible: boolean; premium: boolean;
}

const STATUS_LABELS: { id: string; label: string }[] = [
  { id: 'in_progress', label: 'Em Progresso' },
  { id: 'completed', label: 'Finalizados' },
  { id: 'wishlist', label: 'Lista de Desejos' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'dropped', label: 'Abandonados' },
];

const MEDIA_TYPES = ['movie', 'series', 'game', 'book'] as const;
const mediaIcon = (type: string) => <span className="text-xs leading-none">{TYPE_META[type]?.emoji || '📄'}</span>;

const GENERAL_EXTRA: LayoutSectionDef[] = [
  { id: 'top_5', label: 'Top 5', icon: <Trophy className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'general_all', label: 'Geral (todos os logs)', icon: <Layers className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'custom_lists', label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" />, visible: false, premium: false },
  ...MEDIA_TYPES.map(type => ({
    id: `all_${type}`,
    label: `Todos ${TYPE_META[type]?.label}`,
    icon: mediaIcon(type),
    visible: false,
    premium: false,
  })),
  ...STATUS_LABELS.flatMap(s =>
    MEDIA_TYPES.map(type => ({
      id: `${s.id}_${type}`,
      label: `${s.label} ${TYPE_META[type]?.singular}`,
      icon: mediaIcon(type),
      visible: false,
      premium: false,
    })),
  ),
];

const GENERAL_DESKTOP: LayoutSectionDef[] = [
  { id: 'favorite_games', label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent_games', label: 'Logs recentes', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'posts', label: 'Posts', icon: <MessageCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
  ...GENERAL_EXTRA,
];
const GENERAL_MOBILE: LayoutSectionDef[] = GENERAL_DESKTOP;
const GENERAL_SIDEBAR: LayoutSectionDef[] = [
  { id: 'favorites', label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'top_5', label: 'Top 5', icon: <Trophy className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'rating_distribution', label: 'Avaliações', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'stats', label: 'Estatísticas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'top_genres', label: 'Gêneros / Categorias', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'hours', label: 'Horas por Mídia', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'activity_map', label: 'Mapa de Atividade', icon: <Activity className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent_activity', label: 'Logs recentes', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'badges', label: 'Medalhas', icon: <Medal className="h-3.5 w-3.5" />, visible: true, premium: false },
];

const MEDIA_DESKTOP: LayoutSectionDef[] = [
  { id: 'top_5', label: 'Top 5', icon: <Heart className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent', label: 'Logs recentes', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'in_progress', label: 'Em Progresso', icon: <Target className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'completed', label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'wishlist', label: 'Lista de Desejos', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'library', label: 'Biblioteca', icon: <BookOpen className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'dropped', label: 'Abandonados', icon: <X className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'all_items', label: 'Todos', icon: <Layers className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'custom_lists', label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" />, visible: true, premium: false },
];
const MEDIA_MOBILE: LayoutSectionDef[] = MEDIA_DESKTOP;
const MEDIA_SIDEBAR: LayoutSectionDef[] = GENERAL_SIDEBAR.map((s) =>
  s.id === 'badges' ? { ...s, visible: false } : s,
);

const CATEGORY_DEFAULTS: Record<LayoutCategory, Record<LayoutDevice, LayoutSectionDef[]>> = {
  general: { desktop: GENERAL_DESKTOP, mobile: GENERAL_MOBILE, sidebar: GENERAL_SIDEBAR },
  games: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  movies: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  series: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  books: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
};

const SIDEBAR_TOP_IDS = ['favorites', 'top_5'];
const SIDEBAR_BOTTOM_IDS = ['badges'];

const enforceSidebarOrder = <T extends { id: string }>(sections: T[]): T[] => {
  const top = sections.filter(s => SIDEBAR_TOP_IDS.includes(s.id));
  const bottom = sections.filter(s => SIDEBAR_BOTTOM_IDS.includes(s.id));
  const rest = sections.filter(s => !SIDEBAR_TOP_IDS.includes(s.id) && !SIDEBAR_BOTTOM_IDS.includes(s.id));
  return [...top, ...rest, ...bottom];
};

type SettingsTab = 'general' | 'profile' | 'security' | 'privacy' | 'import' | 'premium' | 'community';

interface SettingsPageProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onDeleteAccount: () => void;
}

const SettingsPage = ({ user, onUserUpdate, onDeleteAccount }: SettingsPageProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [accentColor, setAccentColor] = useState(user.accent_color || '#ff6b35');
  const [uploading, setUploading] = useState<'banner' | 'avatar' | null>(null);
  const [framingTarget, setFramingTarget] = useState<'banner' | 'avatar' | null>(null);
  const [framingPositionOnly, setFramingPositionOnly] = useState(false);
  const [framingUrl, setFramingUrl] = useState<string | null>(null);
  const gifFileRef = useRef<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [birthDate, setBirthDate] = useState(user.birth_date ? String(user.birth_date).slice(0, 10) : '');
  const [showBirthForm, setShowBirthForm] = useState(false);
  const [changingBirthDate, setChangingBirthDate] = useState(false);
  const birthDateLocked = !!user.birth_date_updated_at;

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [country, setCountry] = useState(user.country || '');
  const [state, setState] = useState(user.state || '');

  // Profile tab state
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  const [visibility, setVisibility] = useState({
    profile_public: user.profile_public ?? true,
    show_game_library: user.show_game_library ?? true,
    show_achievements: user.show_achievements ?? true,
    show_hours: user.show_hours ?? false,
    show_stats: user.show_stats ?? true,
  });
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Parse saved section_order — supports both old {desktop,mobile,sidebar} and new per-category format
  const parseSectionOrder = (): Record<string, any> | null => {
    try {
      const raw = user.section_order;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return null;
    } catch { return null; }
  };

  const savedLayout = parseSectionOrder();

  // Migrate old format → per-category format
  const migrateLayout = (saved: Record<string, any> | null): Record<LayoutCategory, Record<LayoutDevice, LayoutSectionDef[]>> => {
    const result: Record<string, any> = {};
    // If saved has direct desktop/mobile/sidebar keys, it's old format — migrate to default
    if (saved && typeof saved.desktop !== 'undefined') {
      for (const cat of LAYOUT_CATEGORIES) {
        result[cat] = {
          desktop: saved.desktop as LayoutSectionDef[],
          mobile: (saved.mobile as LayoutSectionDef[]) || CATEGORY_DEFAULTS[cat].mobile,
          sidebar: (saved.sidebar as LayoutSectionDef[]) || CATEGORY_DEFAULTS[cat].sidebar,
        };
      }
    } else {
      // New per-category format
      for (const cat of LAYOUT_CATEGORIES) {
        const catSaved = saved?.[cat];
        if (catSaved && typeof catSaved === 'object') {
          result[cat] = {
            desktop: catSaved.desktop as LayoutSectionDef[] || CATEGORY_DEFAULTS[cat].desktop,
            mobile: catSaved.mobile as LayoutSectionDef[] || CATEGORY_DEFAULTS[cat].mobile,
            sidebar: catSaved.sidebar as LayoutSectionDef[] || CATEGORY_DEFAULTS[cat].sidebar,
          };
        } else {
          result[cat] = { ...CATEGORY_DEFAULTS[cat] };
        }
      }
    }
    return result as Record<LayoutCategory, Record<LayoutDevice, LayoutSectionDef[]>>;
  };

  const initCategoryLayout = (category: LayoutCategory, device: LayoutDevice, defaults: LayoutSectionDef[]) => {
    const catSaved = migrateLayout(savedLayout)[category];
    const saved = catSaved?.[device];
    if (saved && Array.isArray(saved)) {
      const result = defaults.map(d => {
        const match = saved.find((s: any) => s.id === d.id);
        return match ? { ...d, visible: match.visible ?? d.visible } : d;
      }).sort((a, b) => {
        const idxA = saved.findIndex((s: any) => s.id === a.id);
        const idxB = saved.findIndex((s: any) => s.id === b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      return device === 'sidebar' ? enforceSidebarOrder(result) : result;
    }
    return device === 'sidebar' ? enforceSidebarOrder(defaults) : defaults;
  };

  const [layoutCategory, setLayoutCategory] = useState<LayoutCategory>('general');
  const [layoutDeviceTab, setLayoutDeviceTab] = useState<LayoutDevice>('desktop');

  // Initialize all category layouts
  const initAllLayouts = () => {
    const result: Record<string, Record<string, LayoutSectionDef[]>> = {};
    for (const cat of LAYOUT_CATEGORIES) {
      result[cat] = {};
      const defaults = CATEGORY_DEFAULTS[cat];
      for (const dev of ['desktop', 'mobile', 'sidebar'] as LayoutDevice[]) {
        result[cat][dev] = initCategoryLayout(cat, dev, defaults[dev]);
      }
    }
    return result;
  };
  const [layoutByCategory, setLayoutByCategory] = useState<Record<string, Record<string, LayoutSectionDef[]>>>(initAllLayouts);

  const getCurrentSections = () => layoutByCategory[layoutCategory]?.[layoutDeviceTab] || [];
  const setCurrentSections = (sections: LayoutSectionDef[]) => {
    setLayoutByCategory(prev => ({
      ...prev,
      [layoutCategory]: {
        ...prev[layoutCategory],
        [layoutDeviceTab]: sections,
      },
    }));
  };

  const showSuccess = (text: string) => setMessage({ type: 'success', text });
  const showError = (text: string) => setMessage({ type: 'error', text });

  const handleFileUpload = async (file: File, uploadType: 'banner' | 'avatar') => {
    setUploading(uploadType);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await uploadFile(`/users/${user.id}/upload/${uploadType}`, formData);
      const updatedUser = { ...user, [`${uploadType}_url`]: res.data.url };
      onUserUpdate(updatedUser);
      showSuccess(`${uploadType === 'banner' ? 'Banner' : 'Avatar'} atualizado!`);
    } catch (err) {
      console.error(err);
      showError('Erro ao fazer upload.');
    } finally {
      setUploading(null);
    }
  };

  const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

  const validateImageFile = (file: File, uploadType: 'banner' | 'avatar'): Promise<{ valid: boolean; error?: string }> => {
    if (file.size > MAX_UPLOAD_SIZE) {
      return Promise.resolve({ valid: false, error: 'Arquivo muito grande. Tamanho máximo: 5MB.' });
    }
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (uploadType === 'banner') {
          // Banner sem restrição de largura/proporção — o usuário escolhe o recorte
          // (cover + pan/zoom/rotação) no ImageFramingModal.
        } else {
          if (w < 256 || h < 256) {
            resolve({ valid: false, error: 'Avatar muito pequeno. Use pelo menos 256x256px.' });
            return;
          }
          const ratio = w / h;
          if (ratio < 0.9 || ratio > 1.1) {
            resolve({ valid: false, error: 'Avatar deve ser uma imagem quadrada (1:1).' });
            return;
          }
        }
        resolve({ valid: true });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: 'Não foi possível ler a imagem.' });
      };
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, uploadType: 'banner' | 'avatar') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = await validateImageFile(file, uploadType);
    if (!check.valid) {
      showError(check.error || 'Imagem inválida.');
      return;
    }
    if (file.type === 'image/gif') {
      if (uploadType === 'banner') {
        gifFileRef.current = file;
        setFramingPositionOnly(true);
        setFramingUrl(URL.createObjectURL(file));
        setFramingTarget(uploadType);
        return;
      }
      handleFileUpload(file, uploadType);
      return;
    }
    setFramingPositionOnly(false);
    setFramingUrl(URL.createObjectURL(file));
    setFramingTarget(uploadType);
  };

  const handleFramingConfirm = async (blob: Blob) => {
    if (!framingTarget) return;
    const file = new File([blob], `${framingTarget}.jpg`, { type: 'image/jpeg' });
    setFramingUrl(null);
    setFramingTarget(null);
    await handleFileUpload(file, framingTarget);
  };

  const handleFramingPositionConfirm = async (position: string) => {
    const file = gifFileRef.current;
    setFramingUrl(null);
    setFramingTarget(null);
    setFramingPositionOnly(false);
    gifFileRef.current = null;
    if (!user) return;
    setUploading('banner');
    setMessage(null);
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await uploadFile(`/users/${user.id}/upload/banner`, formData);
      }
      const res = await api.put(`/users/${user.id}/profile`, { banner_position: position });
      onUserUpdate(res.data);
      showSuccess('Banner atualizado!');
    } catch (err) {
      console.error(err);
      showError('Erro ao fazer upload.');
    } finally {
      setUploading(null);
    }
  };

  const openBannerReposition = () => {
    if (!user.banner_url) return;
    gifFileRef.current = null;
    setFramingPositionOnly(true);
    setFramingUrl(imageUrl(user.banner_url) || user.banner_url);
    setFramingTarget('banner');
  };

  const handleVisibilityToggle = async (key: keyof typeof visibility) => {
    setSavingVisibility(true);
    setMessage(null);
    try {
      const next = { ...visibility, [key]: !visibility[key] };
      const res = await api.put(`/users/${user.id}/profile`, { [key]: next[key] });
      setVisibility(next);
      onUserUpdate(res.data);
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar a preferência.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const toSave: Record<string, Record<LayoutDevice, LayoutSectionDef[]>> = {} as any;
      for (const cat of LAYOUT_CATEGORIES) {
        toSave[cat] = {
          desktop: layoutByCategory[cat]?.desktop || [],
          mobile: layoutByCategory[cat]?.mobile || [],
          sidebar: enforceSidebarOrder(layoutByCategory[cat]?.sidebar || []),
        };
      }
      const sectionOrderData = JSON.stringify(toSave);

      const res = await api.put(`/users/${user.id}/profile`, {
        accent_color: accentColor,
        country,
        state,
        display_name: displayName || null,
        bio: bio || null,
        section_order: sectionOrderData,
      });
      onUserUpdate(res.data);
      showSuccess('Perfil salvo com sucesso!');
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (uploadType: 'banner' | 'avatar') => {
    setUploading(uploadType);
    setMessage(null);
    try {
      await deleteUpload(user.id, uploadType);
      const updatedUser = { ...user, [`${uploadType}_url`]: null };
      onUserUpdate(updatedUser);
      showSuccess(`${uploadType === 'banner' ? 'Banner' : 'Avatar'} removido!`);
    } catch (err) {
      console.error(err);
      showError('Erro ao remover imagem.');
    } finally {
      setUploading(null);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      showError('Preencha todos os campos.');
      return;
    }
    setChangingEmail(true);
    setMessage(null);
    try {
      const res = await api.put(`/users/${user.id}/change-email`, {
        current_password: emailPassword,
        new_email: newEmail.trim(),
      });
      onUserUpdate(res.data);
      setNewEmail('');
      setEmailPassword('');
      showSuccess('Email alterado com sucesso!');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao alterar email.');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangeBirthDate = async () => {
    if (birthDateLocked) {
      showError('Sua data de nascimento já foi alterada. Só é permitido alterar uma única vez.');
      return;
    }
    if (!birthDate) {
      showError('Informe a data de nascimento.');
      return;
    }
    setChangingBirthDate(true);
    setMessage(null);
    try {
      const res = await api.put(`/users/${user.id}/profile`, { birth_date: birthDate });
      onUserUpdate(res.data);
      setShowBirthForm(false);
      showSuccess('Data de nascimento atualizada!');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao salvar data de nascimento.');
    } finally {
      setChangingBirthDate(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError('As senhas não coincidem.');
      return;
    }
    setChangingPassword(true);
    setMessage(null);
    try {
      await api.put(`/users/${user.id}/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showSuccess('Senha alterada com sucesso!');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao alterar senha.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      onDeleteAccount();
    } catch (err) {
      console.error(err);
      showError('Erro ao excluir conta.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleWipeData = async () => {
    setWiping(true);
    setMessage(null);
    try {
      await api.post(`/users/${user.id}/wipe`);
      showSuccess('Dados limpos! Posts, respostas, seguidores e seguindo mantidos.');
      setShowWipeConfirm(false);
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Erro ao limpar dados.');
    } finally {
      setWiping(false);
    }
  };

  const bannerUrl = imageUrl(user.banner_url);
  const avatarUrl = imageUrl(user.avatar_url);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'Geral', icon: <UserIcon className="h-4 w-4" /> },
    { id: 'profile', label: 'Perfil', icon: <SettingsIcon className="h-4 w-4" /> },
    { id: 'security', label: 'Segurança', icon: <Shield className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacidade', icon: <Eye className="h-4 w-4" /> },
    { id: 'import', label: 'Importar', icon: <Download className="h-4 w-4" /> },
  ];

  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Username</h2>
            <p className="text-xs text-white/50 mt-0.5">Sua URL de perfil única. Pode ser alterado uma vez por mês.</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-4">
          <div>
            <p className="text-xs text-white/50">Username</p>
            <p className="mt-0.5 text-sm font-medium text-white">{user.username}</p>
            <p className="mt-1 text-xs text-white/40">Próxima alteração disponível em 13 de ago. de 2026</p>
          </div>
          <button disabled className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors disabled:opacity-50">
            <Pencil className="h-3.5 w-3.5" />
            Alterar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">País e Estado</h2>
            <p className="text-xs text-white/50 mt-0.5">Informe onde você mora. Exibido no seu perfil. Pode ser alterado a cada 6 meses.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/50">País</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]">
              <option value="">Selecione um país</option>
              <option value="BR">Brasil</option>
              <option value="US">Estados Unidos</option>
              <option value="PT">Portugal</option>
              <option value="ES">Espanha</option>
              <option value="FR">França</option>
              <option value="DE">Alemanha</option>
              <option value="IT">Itália</option>
              <option value="JP">Japão</option>
              <option value="AR">Argentina</option>
              <option value="MX">México</option>
              <option value="CA">Canadá</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/50">Estado</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]">
              <option value="">Selecione um estado</option>
              <option value="AC">Acre</option>
              <option value="AL">Alagoas</option>
              <option value="AP">Amapá</option>
              <option value="AM">Amazonas</option>
              <option value="BA">Bahia</option>
              <option value="CE">Ceará</option>
              <option value="DF">Distrito Federal</option>
              <option value="ES">Espírito Santo</option>
              <option value="GO">Goiás</option>
              <option value="MA">Maranhão</option>
              <option value="MT">Mato Grosso</option>
              <option value="MS">Mato Grosso do Sul</option>
              <option value="MG">Minas Gerais</option>
              <option value="PA">Pará</option>
              <option value="PB">Paraíba</option>
              <option value="PR">Paraná</option>
              <option value="PE">Pernambuco</option>
              <option value="PI">Piauí</option>
              <option value="RJ">Rio de Janeiro</option>
              <option value="RN">Rio Grande do Norte</option>
              <option value="RS">Rio Grande do Sul</option>
              <option value="RO">Rondônia</option>
              <option value="RR">Roraima</option>
              <option value="SC">Santa Catarina</option>
              <option value="SP">São Paulo</option>
              <option value="SE">Sergipe</option>
              <option value="TO">Tocantins</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Nome de Exibição</h2>
            <p className="text-xs text-white/50 mt-0.5">Nome que aparece no seu perfil público.</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-4">
          {editingDisplayName ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user.username}
                className="flex-1 rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingDisplayName(false); if (e.key === 'Escape') { setDisplayName(user.display_name || ''); setEditingDisplayName(false); } }}
              />
              <button onClick={() => setEditingDisplayName(false)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white">Salvar</button>
              <button onClick={() => { setDisplayName(user.display_name || ''); setEditingDisplayName(false); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/50 hover:text-white">Cancelar</button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-white">{displayName || user.display_name || user.username}</p>
                <p className="text-xs text-white/40">Username: {user.username}</p>
              </div>
              <button onClick={() => setEditingDisplayName(true)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white">
                <Pencil className="h-3.5 w-3.5" />
                Alterar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Biografia</h2>
            <p className="text-xs text-white/50 mt-0.5">Conte um pouco sobre você. Máximo 100 caracteres.</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-4">
          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 100))}
                placeholder="Escreva sua biografia..."
                className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)] resize-none"
                rows={3}
                maxLength={100}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">{bio.length}/100</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditingBio(false)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white">Salvar</button>
                  <button onClick={() => { setBio(user.bio || ''); setEditingBio(false); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/50 hover:text-white">Cancelar</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-white/70 whitespace-pre-wrap">{bio || user.bio || 'Nenhuma biografia definida.'}</p>
              <button onClick={() => setEditingBio(true)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white shrink-0">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Banner</h2>
            <p className="text-xs text-white/50 mt-0.5">Tamanho ideal: 1400x300px. Max 5 MB.</p>
          </div>
        </div>
        <div
          className="w-full h-48 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed flex items-center justify-center transition-colors"
          style={{ background: 'var(--mdf-bg)', borderColor: 'var(--border)' }}
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-white/40">{uploading === 'banner' ? 'Enviando...' : 'Clique para enviar banner'}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => bannerInputRef.current?.click()} disabled={uploading === 'banner'} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50">
            Alterar
          </button>
          {bannerUrl && user.banner_url?.toLowerCase().endsWith('.gif') && (
            <button onClick={openBannerReposition} disabled={uploading === 'banner'} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ajustar posição
            </button>
          )}
          {bannerUrl && (
            <button onClick={() => handleDeleteImage('banner')} disabled={uploading === 'banner'} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50" style={{ borderColor: 'rgba(248,113,113,0.3)', color: '#f87171' }}>
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </button>
          )}
        </div>
        <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Avatar</h2>
            <p className="text-xs text-white/50 mt-0.5">JPEG, PNG, WebP ou GIF. Max 5 MB.</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: 'var(--mdf-bg)', border: '3px solid var(--border)' }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-white/40">{user.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm text-white/50 mb-1">{uploading === 'avatar' ? 'Enviando...' : 'Clique no avatar para alterar'}</p>
            <p className="text-xs text-white/30">JPEG, PNG, WebP ou GIF. Max 5 MB.</p>
            {avatarUrl && (
              <button onClick={() => handleDeleteImage('avatar')} disabled={uploading === 'avatar'} className="mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50" style={{ borderColor: 'rgba(248,113,113,0.3)', color: '#f87171' }}>
                <Trash2 className="h-3.5 w-3.5" />
                Remover avatar
              </button>
            )}
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFileChange(e, 'avatar')} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Cor de Destaque</h2>
            <p className="text-xs text-white/50 mt-0.5">Usada nas bordas e detalhes do seu perfil.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-2" style={{ borderColor: 'var(--border)', background: 'transparent', padding: 0 }} />
          <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-28 font-mono text-sm rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 py-2 text-white" />
          <div className="w-10 h-10 rounded-lg" style={{ background: accentColor, border: `2px solid ${accentColor}` }} />
        </div>
      </div>

      {/* Layout */}
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Layout do Perfil</h2>
            <p className="text-xs text-white/50 mt-0.5">Configure a ordem e visibilidade das seções para cada tipo de página.</p>
          </div>
        </div>
        {/* Category tabs - row 1 */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {LAYOUT_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setLayoutCategory(cat)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize"
              style={{ background: layoutCategory === cat ? 'var(--accent)' : 'rgba(255,255,255,0.04)', color: layoutCategory === cat ? '#fff' : 'var(--text-muted)' }}
            >
              {cat === 'general' ? 'Geral' : cat === 'games' ? 'Jogos' : cat === 'movies' ? 'Filmes' : cat === 'series' ? 'Séries' : 'Livros'}
            </button>
          ))}
        </div>
        {/* Device sub-tabs - row 2 */}
        <div className="flex gap-1 mb-4 border-b border-white/5 pb-3">
          {(['desktop', 'mobile', 'sidebar'] as const).map((dev) => (
            <button key={dev} onClick={() => setLayoutDeviceTab(dev)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ background: layoutDeviceTab === dev ? 'var(--accent)' : 'rgba(255,255,255,0.04)', color: layoutDeviceTab === dev ? '#fff' : 'var(--text-muted)' }}
            >
              {dev === 'desktop' ? 'Desktop' : dev === 'mobile' ? 'Mobile' : 'Sidebar'}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {layoutDeviceTab === 'sidebar' && (
              <p className="mb-3 text-[11px] text-white/40">Favoritos e Top 5 ficam sempre no topo; Medalhas sempre no final.</p>
            )}
            <div className="space-y-1">
              {getCurrentSections().map((section, idx, arr) => {
                const isSidebar = layoutDeviceTab === 'sidebar';
                const canUp = isSidebar ? !(idx === 0 || SIDEBAR_TOP_IDS.includes(arr[idx - 1]?.id)) : idx > 0;
                const canDown = isSidebar ? !(idx === arr.length - 1 || SIDEBAR_BOTTOM_IDS.includes(arr[idx + 1]?.id)) : idx < arr.length - 1;
                return (
                <div key={section.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => { if (canUp) { const updated = [...arr]; [updated[idx-1], updated[idx]] = [updated[idx], updated[idx-1]]; setCurrentSections(updated); } }}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20" disabled={!canUp}><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => { if (canDown) { const updated = [...arr]; [updated[idx], updated[idx+1]] = [updated[idx+1], updated[idx]]; setCurrentSections(updated); } }}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20" disabled={!canDown}><ChevronDown className="h-3 w-3" /></button>
                    </div>
                    <span className="text-white/50">{section.icon}</span>
                    <span className="text-sm text-white">{section.label}</span>
                    {section.premium && <span title="Premium"><Crown className="h-3 w-3 text-yellow-500" /></span>}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={section.visible}
                      onChange={() => { const updated = [...arr]; updated[idx] = { ...updated[idx], visible: !updated[idx].visible }; setCurrentSections(updated); }}
                      className="sr-only peer" disabled={section.premium} />
                    <div className="w-9 h-5 rounded-full bg-white/10 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white/40 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                  </label>
                </div>
                );
              })}
            </div>
          </div>
          {layoutDeviceTab !== 'sidebar' && (
            <div className="hidden xl:flex shrink-0 items-start justify-center">
              <LayoutPreview
                device={layoutDeviceTab}
                sections={getCurrentSections()}
                username={user.username}
                displayName={user.display_name}
                accentColor={user.accent_color}
                avatarUrl={user.avatar_url}
              />
            </div>
          )}
          {layoutDeviceTab === 'sidebar' && (
            <div className="hidden xl:block w-[324px] shrink-0 rounded-2xl border border-white/5 bg-[var(--mdf-bg)] overflow-hidden">
              <RightSidebar
                user={user}
                isCollapsed={false}
                onToggleCollapse={() => {}}
                embedded
                previewOrder={layoutByCategory[layoutCategory]?.sidebar?.filter(s => s.visible).map(s => s.id) || []}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-4 lg:p-6">
        <h2 className="text-sm lg:text-lg font-semibold text-white">Segurança</h2>
        <p className="mt-0.5 lg:mt-1 text-xs lg:text-sm text-white/50">Gerencie sua senha e configurações de segurança.</p>
        <div className="mt-3 lg:mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Alterar Senha</p>
                <p className="text-xs text-white/40">Atualize sua senha atual.</p>
              </div>
              <button type="button" onClick={() => setShowPasswordForm(!showPasswordForm)} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-80">{showPasswordForm ? 'Cancelar' : 'Alterar Senha'}</button>
            </div>
            {showPasswordForm && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Senha atual" className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha" className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirmar nova senha" className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                <button className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50" onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmNewPassword}>{changingPassword ? 'Salvando...' : 'Salvar nova senha'}</button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Alterar Email</p>
                <p className="text-xs text-white/40">Email atual: <span className="text-white/60">{user.email || '—'}</span></p>
              </div>
              <button type="button" onClick={() => setShowEmailForm(!showEmailForm)} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-80">{showEmailForm ? 'Cancelar' : 'Alterar Email'}</button>
            </div>
            {showEmailForm && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Novo email" className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="Senha atual para confirmar" className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
                <button className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50" onClick={handleChangeEmail} disabled={changingEmail || !newEmail || !emailPassword}>{changingEmail ? 'Salvando...' : 'Salvar email'}</button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Data de Nascimento</p>
                <p className="text-xs text-white/40">{birthDateLocked ? 'Data de nascimento já definida. Só é possível alterar uma única vez.' : 'Informe sua data de nascimento. Só é permitido alterar uma única vez.'}</p>
              </div>
              {!birthDateLocked ? (
                <button type="button" onClick={() => setShowBirthForm(!showBirthForm)} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-80">{showBirthForm ? 'Cancelar' : 'Alterar'}</button>
              ) : (
                <span className="shrink-0 rounded-lg bg-white/5 px-4 py-1.5 text-xs font-medium text-white/40">Já alterada</span>
              )}
            </div>
            {showBirthForm ? (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 [color-scheme:dark]" />
                <button className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50" onClick={handleChangeBirthDate} disabled={changingBirthDate || !birthDate}>{changingBirthDate ? 'Salvando...' : 'Salvar data'}</button>
              </div>
            ) : (
              <span className="text-sm text-white/60">{birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-4 lg:p-6">
        <h2 className="text-sm lg:text-lg font-semibold" style={{ color: '#f87171' }}>Zona de Perigo</h2>
        <p className="mt-0.5 lg:mt-1 text-xs lg:text-sm text-white/50">Ações irreversíveis. Requerem confirmação.</p>
        <div className="mt-3 lg:mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 lg:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Limpar Dados</p>
                <p className="mt-1 text-xs text-white/40">Apaga logs, reviews, posts e badges. Mantém avatar, banner, cor e badges especiais.</p>
              </div>
              <button type="button" onClick={() => setShowWipeConfirm(true)} disabled={wiping}
                className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                style={{ background: 'rgba(250,204,21,0.1)', color: '#eab308', border: '1px solid rgba(250,204,21,0.3)' }}>
                {wiping ? 'Limpando...' : 'Limpar'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 lg:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Excluir Conta</p>
                <p className="mt-1 text-xs text-white/40">Apaga permanentemente sua conta e todos os seus dados.</p>
              </div>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}
                className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Visibilidade do perfil</h2>
            <p className="text-xs text-white/50 mt-0.5">Quem pode ver seu perfil e atividades.</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { key: 'profile_public', label: 'Perfil público', desc: 'Qualquer pessoa pode ver seu perfil' },
            { key: 'show_game_library', label: 'Mostrar jogos na biblioteca', desc: 'Exibe sua biblioteca de jogos para visitantes' },
            { key: 'show_achievements', label: 'Mostrar conquistas', desc: 'Exibe suas conquistas desbloqueadas' },
            { key: 'show_hours', label: 'Mostrar tempo de jogo', desc: 'Exibe horas totais jogadas' },
            { key: 'show_stats', label: 'Mostrar estatísticas', desc: 'Exibe estatísticas de conclusão, platina, etc.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!!visibility[item.key as keyof typeof visibility]} onChange={() => handleVisibilityToggle(item.key as keyof typeof visibility)} disabled={savingVisibility} className="sr-only peer" />
                <div className="w-11 h-6 rounded-full bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent)]/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white/40 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Atividade e feed</h2>
            <p className="text-xs text-white/50 mt-0.5">Controle o que aparece no feed dos seus seguidores.</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Compartilhar novas conquistas', desc: 'Posta automaticamente quando você desbloqueia uma conquista' },
            { label: 'Compartilhar jogos finalizados', desc: 'Posta quando você marca um jogo como finalizado' },
            { label: 'Compartilhar reviews', desc: 'Posta suas reviews públicas no feed' },
            { label: 'Compartilhar screenshots', desc: 'Posta screenshots que você compartilha que você marca como público' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 rounded-full bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent)]/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white/40 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderImportTab = () => (
    <ImportPage user={user} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'profile': return renderProfileTab();
      case 'security': return renderSecurityTab();
      case 'privacy': return renderPrivacyTab();
      case 'import': return renderImportTab();
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Configurações</h1>
        <p className="mt-1 text-sm text-white/50">Gerencie sua conta, plataformas conectadas e preferências.</p>
      </div>

      {message && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2" style={{
          background: message.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
        }}>
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] overflow-hidden">
        <div className="-mx-5 border-b border-white/5 px-5 hidden lg:block">
          <div className="-mb-px flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 whitespace-nowrap px-2 py-3 text-center text-sm transition-colors"
                style={{
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
              >
                <span className="flex items-center justify-center gap-1.5">{tab.icon}{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative lg:hidden">
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto py-0.5 px-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className="flex h-7 shrink-0 items-center whitespace-nowrap rounded-sm px-3 text-xs font-bold transition-colors"
                style={{
                  background: activeTab === tab.id ? 'var(--accent)/15' : 'rgba(255,255,255,0.04)',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  border: activeTab === tab.id ? '1px solid var(--accent)/30' : '1px solid transparent',
                }}
              >
                <span className="flex items-center gap-1">{tab.icon}{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 lg:p-8 animate-[fadeInContent_200ms_ease-out]">
          {renderTabContent()}
        </div>
      </div>

      <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <button className="mdf-btn-primary w-full text-center py-3" onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--mdf-surface)] border border-white/10 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Excluir conta</h3>
              <button className="text-white/50 hover:text-white" onClick={() => !deleting && setShowDeleteConfirm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 text-white/70">
              <p>Tem certeza que deseja excluir sua conta <strong className="text-white">{user.username}</strong>?</p>
              <p className="text-sm" style={{ color: '#f87171' }}>Todos os seus logs, reviews e dados serão apagados permanentemente. Esta ação não pode ser desfeita.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white" disabled={deleting}>Cancelar</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 rounded-xl bg-red-600/20 px-4 py-2.5 text-sm font-bold text-red-400 transition-colors hover:bg-red-600/30 border border-red-600/30">{deleting ? 'Excluindo...' : 'Excluir Conta'}</button>
            </div>
          </div>
        </div>
      )}

      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !wiping && setShowWipeConfirm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--mdf-surface)] border border-white/10 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Limpar dados</h3>
              <button className="text-white/50 hover:text-white" onClick={() => !wiping && setShowWipeConfirm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 text-white/70">
              <p>Tem certeza que deseja limpar todos os dados de <strong className="text-white">{user.username}</strong>?</p>
              <p className="text-sm" style={{ color: '#eab308' }}>Logs, reviews, conquistas, listas, curtidas e notificações serão apagados. Posts, respostas, seguidores, seguindo, avatar, banner, cor de destaque e badges especiais serão mantidos.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowWipeConfirm(false)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white" disabled={wiping}>Cancelar</button>
              <button onClick={handleWipeData} disabled={wiping} className="flex-1 rounded-xl bg-yellow-500/20 px-4 py-2.5 text-sm font-bold text-yellow-400 transition-colors hover:bg-yellow-500/30 border border-yellow-500/30">{wiping ? 'Limpando...' : 'Limpar Dados'}</button>
            </div>
          </div>
        </div>
      )}
      <ImageFramingModal
        open={framingTarget !== null && framingUrl !== null}
        sourceUrl={framingUrl || ''}
        aspectRatio={framingTarget === 'avatar' ? 1 : 14 / 3}
        outputWidth={framingTarget === 'avatar' ? 512 : 1400}
        outputHeight={framingTarget === 'avatar' ? 512 : 300}
        title={framingTarget === 'avatar' ? 'Ajustar avatar' : 'Ajustar banner'}
        positionOnly={framingPositionOnly}
        onCancel={() => { if (framingUrl) URL.revokeObjectURL(framingUrl); setFramingUrl(null); setFramingTarget(null); setFramingPositionOnly(false); gifFileRef.current = null; }}
        onConfirm={handleFramingConfirm}
        onConfirmPosition={handleFramingPositionConfirm}
      />
    </div>
  );
};

export default SettingsPage;