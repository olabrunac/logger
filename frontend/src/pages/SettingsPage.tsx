import { useState, useRef } from 'react';
import api, { uploadFile } from '../services/api';
import ImportPage from './ImportPage';
import type { User, SocialLink } from '../types';
import { imageUrl } from '../utils';
import {
  User as UserIcon,
  Globe,
  Shield,
  Download,
  Crown,
  Settings as SettingsIcon,
  Bell,
  Mail,
  Eye,
  Trash2,
  AlertTriangle,
  Check,
  Pencil,
  X,
  ChevronUp,
  ChevronDown,
  Image,
  Music,
  Trophy,
  Monitor,
  Smartphone,
  LayoutDashboard,
  Sparkles,
  Circle,
  Square,
  UserPlus,
  Palette,
  ExternalLink,
  Heart,
  Gamepad2,
  Camera,
  Hash,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Trash,
  Star,
  Award,
  Clock,
  Target,
  Zap,
  Medal,
  Layers,
  Menu,
  CheckCircle,
  ShieldCheck,
  BookOpen,
  Calendar,
  BarChart2,
  Activity,
  Lock,
  Flag,
  Ghost,
  Search,
  Filter,
  MoreVertical,
  Maximize2,
  Minimize2,
  Move,
  Crown as CrownIcon,
  Loader2,
  MessageCircle,
} from 'lucide-react';

// Default profile stats with icons
const DEFAULT_PROFILE_STATS = [
  { id: 'finished', label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'completed', label: 'Completados', icon: <Trophy className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'platinas', label: 'Platinas', icon: <Award className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'time', label: 'Tempo', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'verified', label: 'Verificado', icon: <ShieldCheck className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'achievements', label: 'Conquistas', icon: <Target className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'miletados', label: 'Miletados', icon: <Medal className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'perfects', label: 'Perfeitos', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'hundred', label: '100%', icon: <Zap className="h-3.5 w-3.5" />, visible: true, premium: false },
];

// Per-category layout defaults
const LAYOUT_CATEGORIES = ['general', 'games', 'movies', 'series', 'books'] as const;
type LayoutCategory = (typeof LAYOUT_CATEGORIES)[number];
type LayoutDevice = 'desktop' | 'mobile' | 'sidebar';

interface LayoutSectionDef {
  id: string; label: string; icon: React.ReactNode; visible: boolean; premium: boolean;
}

const GENERAL_DESKTOP: LayoutSectionDef[] = [
  { id: 'stats_grid', label: 'Estatísticas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'favorite_games', label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent_games', label: 'Atividade Recente', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'posts', label: 'Posts', icon: <MessageCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
];
const GENERAL_MOBILE: LayoutSectionDef[] = [
  { id: 'stats_grid', label: 'Estatísticas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'favorite_games', label: 'Favoritos', icon: <Heart className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent_games', label: 'Atividade Recente', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'posts', label: 'Posts', icon: <MessageCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
];
const GENERAL_SIDEBAR: LayoutSectionDef[] = [
  { id: 'badges', label: 'Medalhas', icon: <Medal className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'year_review', label: 'Retrospectiva do Ano', icon: <Calendar className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'rating_distribution', label: 'Distribuição de Notas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'top_genres', label: 'Principais Gêneros', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'activity', label: 'Atividade', icon: <Activity className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'highlights', label: 'Destaques', icon: <Star className="h-3.5 w-3.5" />, visible: false, premium: false },
  { id: 'platforms', label: 'Plataformas', icon: <Monitor className="h-3.5 w-3.5" />, visible: false, premium: false },
];

const MEDIA_DESKTOP: LayoutSectionDef[] = [
  { id: 'stats_grid', label: 'Estatísticas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'top_5', label: 'Top 5', icon: <Heart className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent', label: 'Recentes', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'in_progress', label: 'Em Progresso', icon: <Target className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'completed', label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'wishlist', label: 'Lista de Desejos', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'library', label: 'Biblioteca', icon: <BookOpen className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'dropped', label: 'Abandonados', icon: <X className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'all_items', label: 'Todos', icon: <Layers className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'custom_lists', label: 'Listas Personalizadas', icon: <Menu className="h-3.5 w-3.5" />, visible: true, premium: false },
];
const MEDIA_MOBILE: LayoutSectionDef[] = [
  { id: 'stats_grid', label: 'Estatísticas', icon: <BarChart2 className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'recent', label: 'Recentes', icon: <Clock className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'in_progress', label: 'Em Progresso', icon: <Target className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'completed', label: 'Finalizados', icon: <CheckCircle className="h-3.5 w-3.5" />, visible: true, premium: false },
  { id: 'reviews', label: 'Reviews', icon: <Star className="h-3.5 w-3.5" />, visible: true, premium: false },
];
const MEDIA_SIDEBAR: LayoutSectionDef[] = GENERAL_SIDEBAR;

const CATEGORY_DEFAULTS: Record<LayoutCategory, Record<LayoutDevice, LayoutSectionDef[]>> = {
  general: { desktop: GENERAL_DESKTOP, mobile: GENERAL_MOBILE, sidebar: GENERAL_SIDEBAR },
  games: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  movies: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  series: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
  books: { desktop: MEDIA_DESKTOP, mobile: MEDIA_MOBILE, sidebar: MEDIA_SIDEBAR },
};

// Default setup items
const DEFAULT_SETUP_ITEMS = [
  { id: '1', category: 'Placa de vídeo', name: 'NVIDIA Geforce RTX 3060 Ti', link: '', photos: [] },
  { id: '2', category: 'Volante', name: 'Logitech G29', link: '', photos: [] },
];

// Default favorite characters
const DEFAULT_FAVORITE_CHARACTERS = [] as Array<{id: string; name: string; game: string; image: string}>;

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

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => {
    try {
      const parsed = JSON.parse(user.social_links || '{}');
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  });

  const [country, setCountry] = useState(user.country || '');
  const [state, setState] = useState(user.state || '');

  // Profile tab state
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [avatarFormat, setAvatarFormat] = useState<'circle' | 'square'>('circle');
  const [selectedAvatar, setSelectedAvatar] = useState<'upload' | 'steam' | 'xbox' | 'playstation' | 'nintendo'>('upload');
  const [avatarBorders, setAvatarBorders] = useState<Array<{id: string; name: string; image: string; owned: boolean; premium: boolean}>>([]);
  const [activeAvatarBorder, setActiveAvatarBorder] = useState<string | null>(null);

  // Profile stats with drag order and visibility
  const [profileStats, setProfileStats] = useState(DEFAULT_PROFILE_STATS);

  const [socialLinksInputs, setSocialLinksInputs] = useState(() => {
    try {
      const parsed = JSON.parse(user.social_links || '{}');
      if (!Array.isArray(parsed) && parsed.platforms) {
        return {
          x: parsed.platforms.x || '',
          instagram: parsed.platforms.instagram || '',
          discord: parsed.platforms.discord || '',
          youtube: parsed.platforms.youtube || '',
          twitch: parsed.platforms.twitch || '',
          kick: parsed.platforms.kick || '',
        };
      }
      return { x: '', instagram: '', discord: '', youtube: '', twitch: '', kick: '' };
    } catch { return { x: '', instagram: '', discord: '', youtube: '', twitch: '', kick: '' }; }
  });
  const [spotifyUrl, setSpotifyUrl] = useState(() => {
    try {
      const parsed = JSON.parse(user.social_links || '{}');
      if (!Array.isArray(parsed) && parsed.spotify) return parsed.spotify;
      return '';
    } catch { return ''; }
  });
  
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
      return defaults.map(d => {
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
    }
    return defaults;
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

  // Setup
  const [setupItems, setSetupItems] = useState(DEFAULT_SETUP_ITEMS);

  // Trophy showcase
  const [trophyShowcaseItems, setTrophyShowcaseItems] = useState<Array<{id: number; log_id: number; name: string; image_url?: string; game_title: string}>>(() => {
    try {
      return JSON.parse(user.trophy_showcase || '[]');
    } catch { return []; }
  });
  const [allAchievements, setAllAchievements] = useState<Array<{id: number; log_id: number; external_id: string; name: string; description?: string; image_url?: string; game_title: string; game_cover?: string}>>([]);
  const [showTrophyPicker, setShowTrophyPicker] = useState(false);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [searchAchievements, setSearchAchievements] = useState('');

  // Favorite characters
  const [favoriteCharacters, setFavoriteCharacters] = useState(DEFAULT_FAVORITE_CHARACTERS);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, uploadType: 'banner' | 'avatar') => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, uploadType);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const socialLinksData = JSON.stringify({
        platforms: socialLinksInputs,
        spotify: spotifyUrl,
        custom: socialLinks,
      });

      const sectionOrderData = JSON.stringify(layoutByCategory);

      const res = await api.put(`/users/${user.id}/profile`, {
        accent_color: accentColor,
        social_links: socialLinksData,
        country,
        state,
        display_name: displayName || null,
        bio: bio || null,
        trophy_showcase: JSON.stringify(trophyShowcaseItems),
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
      showSuccess('Dados limpos com sucesso! Avatar, banner, cor e badge dev mantidos.');
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
            <p className="text-xs text-white/50 mt-0.5">Conte um pouco sobre você. Máximo 500 caracteres.</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-4">
          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Escreva sua biografia..."
                className="w-full rounded-lg border border-white/10 bg-[var(--mdf-surface)] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)] resize-none"
                rows={4}
                maxLength={500}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">{bio.length}/500</span>
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
            <h2 className="text-base font-semibold text-white">Estatísticas do Perfil</h2>
            <p className="text-xs text-white/50 mt-0.5">Escolha quais estatísticas exibir e reordene como preferir.</p>
          </div>
        </div>
        <div className="space-y-1">
          {profileStats.map((stat, idx) => (
            <div key={stat.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => { if (idx > 0) { const updated = [...profileStats]; [updated[idx-1], updated[idx]] = [updated[idx], updated[idx-1]]; setProfileStats(updated); } }}
                    className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-20"
                    disabled={idx === 0}
                  ><ChevronUp className="h-3 w-3" /></button>
                  <button
                    onClick={() => { if (idx < profileStats.length - 1) { const updated = [...profileStats]; [updated[idx], updated[idx+1]] = [updated[idx+1], updated[idx]]; setProfileStats(updated); } }}
                    className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-20"
                    disabled={idx === profileStats.length - 1}
                  ><ChevronDown className="h-3 w-3" /></button>
                </div>
                <span className="text-white/50">{stat.icon}</span>
                <span className="text-sm text-white">{stat.label}</span>
                {stat.premium && <span title="Premium"><Crown className="h-3 w-3 text-yellow-500" /></span>}
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stat.visible}
                    onChange={() => { const updated = [...profileStats]; updated[idx] = { ...updated[idx], visible: !updated[idx].visible }; setProfileStats(updated); }}
                    className="sr-only peer"
                    disabled={stat.premium}
                  />
                  <div className="w-9 h-5 rounded-full bg-white/10 peer-focus:outline-none peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white/40 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                </label>
              </div>
            </div>
          ))}
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

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Redes Sociais</h2>
            <p className="text-xs text-white/50 mt-0.5">Links para suas redes sociais. Exibidos no seu perfil.</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { key: 'x', label: 'X (Twitter)', icon: <Hash className="h-4 w-4" /> },
            { key: 'instagram', label: 'Instagram', icon: <Image className="h-4 w-4" /> },
            { key: 'discord', label: 'Discord', icon: <MessageCircle className="h-4 w-4" /> },
            { key: 'youtube', label: 'YouTube', icon: <Monitor className="h-4 w-4" /> },
            { key: 'twitch', label: 'Twitch', icon: <Monitor className="h-4 w-4" /> },
            { key: 'kick', label: 'Kick', icon: <Monitor className="h-4 w-4" /> },
          ].map((platform) => (
            <div key={platform.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-4 py-2.5">
              <span className="text-white/40 w-5 h-5 flex items-center justify-center shrink-0">{platform.icon}</span>
              <span className="text-xs text-white/50 w-20 shrink-0">{platform.label}</span>
              <input
                type="url"
                value={(socialLinksInputs as Record<string, string>)[platform.key] || ''}
                onChange={(e) => setSocialLinksInputs({ ...socialLinksInputs, [platform.key]: e.target.value })}
                placeholder={`https://${platform.key}.com/seu-perfil`}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Spotify</h2>
            <p className="text-xs text-white/50 mt-0.5">Link para seu perfil do Spotify. Exibe seu artista ou playlist em destaque.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-4 py-2.5">
          <span className="text-white/40 w-5 h-5 flex items-center justify-center shrink-0"><Music className="h-4 w-4" /></span>
          <span className="text-xs text-white/50 w-20 shrink-0">Spotify</span>
          <input
            type="url"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/user/seu-id"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
          />
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
        <div className="space-y-1">
          {getCurrentSections().map((section, idx, arr) => (
            <div key={section.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => { if (idx > 0) { const updated = [...arr]; [updated[idx-1], updated[idx]] = [updated[idx], updated[idx-1]]; setCurrentSections(updated); } }}
                    className="text-white/30 hover:text-white/70 disabled:opacity-20" disabled={idx === 0}><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={() => { if (idx < arr.length - 1) { const updated = [...arr]; [updated[idx], updated[idx+1]] = [updated[idx+1], updated[idx]]; setCurrentSections(updated); } }}
                    className="text-white/30 hover:text-white/70 disabled:opacity-20" disabled={idx === arr.length - 1}><ChevronDown className="h-3 w-3" /></button>
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
          ))}
        </div>
      </div>

      {/* Trophy Showcase */}
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Troféus em Destaque</h2>
            <p className="text-xs text-white/50 mt-0.5">Até 5 conquistas em destaque no seu perfil.</p>
          </div>
        </div>
        <div className="space-y-2">
          {trophyShowcaseItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--mdf-bg)] py-8">
              <Trophy className="h-8 w-8 text-white/30" />
              <p className="mt-3 text-sm text-white/50">Nenhum troféu em destaque</p>
              <p className="mt-1 text-xs text-white/40">Clique no botão abaixo para adicionar conquistas.</p>
            </div>
          ) : (
            trophyShowcaseItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-3 py-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Trophy className="w-full h-full p-1.5 text-white/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  <p className="text-xs text-white/40 truncate">{item.game_title}</p>
                </div>
                <button onClick={() => setTrophyShowcaseItems(trophyShowcaseItems.filter((_, i) => i !== idx))} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        <button onClick={() => { setShowTrophyPicker(true); if (allAchievements.length === 0) { setLoadingAchievements(true); api.get(`/users/${user.id}/achievements`).then(res => setAllAchievements(res.data)).catch(() => {}).finally(() => setLoadingAchievements(false)); } }} disabled={trophyShowcaseItems.length >= 5} className="mt-3 w-full rounded-xl border border-white/10 bg-[var(--mdf-bg)] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40">
          {trophyShowcaseItems.length >= 5 ? 'Limite de 5 atingido' : 'Adicionar Conquista'}
        </button>
      </div>

      {showTrophyPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrophyPicker(false)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-[var(--mdf-surface)] border border-white/10 p-5 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Selecionar Conquistas</h3>
              <button className="text-white/50 hover:text-white" onClick={() => setShowTrophyPicker(false)}><X className="h-5 w-5" /></button>
            </div>
            <input type="text" value={searchAchievements} onChange={(e) => setSearchAchievements(e.target.value)} placeholder="Buscar conquistas..." className="w-full rounded-lg border border-white/10 bg-[var(--mdf-bg)] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 mb-3" />
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {loadingAchievements ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
                </div>
              ) : allAchievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Trophy className="h-8 w-8 text-white/30" />
                  <p className="mt-2 text-sm text-white/50">Nenhuma conquista desbloqueada</p>
                </div>
              ) : (
                allAchievements
                  .filter(a => a.name.toLowerCase().includes(searchAchievements.toLowerCase()) || a.game_title.toLowerCase().includes(searchAchievements.toLowerCase()))
                  .map((ach) => {
                    const isSelected = trophyShowcaseItems.some(t => t.id === ach.id);
                    return (
                      <button key={ach.id} onClick={() => {
                        if (isSelected) {
                          setTrophyShowcaseItems(trophyShowcaseItems.filter(t => t.id !== ach.id));
                        } else if (trophyShowcaseItems.length < 5) {
                          setTrophyShowcaseItems([...trophyShowcaseItems, { id: ach.id, log_id: ach.log_id, name: ach.name, image_url: ach.image_url, game_title: ach.game_title }]);
                        }
                      }} disabled={!isSelected && trophyShowcaseItems.length >= 5} className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10 bg-[var(--mdf-bg)] hover:border-white/20'} disabled:opacity-40`}>
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 shrink-0">
                          {ach.image_url ? <img src={ach.image_url} alt={ach.name} className="w-full h-full object-cover" /> : <Trophy className="w-full h-full p-1.5 text-white/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{ach.name}</p>
                          <p className="text-xs text-white/40 truncate">{ach.game_title}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />}
                      </button>
                    );
                  })
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/40">{trophyShowcaseItems.length}/5 selecionados</span>
              <button onClick={() => setShowTrophyPicker(false)} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white">Concluído</button>
            </div>
          </div>
        </div>
      )}

      {/* Favorite Characters */}
      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Personagens Favoritos</h2>
            <p className="text-xs text-white/50 mt-0.5">Seus personagens favoritos em destaque.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[var(--mdf-bg)] py-8">
          <Ghost className="h-8 w-8 text-white/30" />
          <p className="mt-3 text-sm text-white/50">Nenhum personagem adicionado ainda</p>
          <p className="mt-1 text-xs text-white/40">Em breve você poderá adicionar personagens aqui.</p>
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
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Autenticação de dois fatores</p>
                <p className="mt-1 text-xs text-white/40">Adicione um segundo passo a cada login.</p>
              </div>
              <button type="button" className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-80">Ativar 2FA</button>
            </div>
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
                <p className="text-xs text-white/40">Informe sua data de nascimento.</p>
              </div>
              <button type="button" onClick={() => setShowBirthForm(!showBirthForm)} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-80">{showBirthForm ? 'Cancelar' : 'Alterar'}</button>
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
            { label: 'Perfil público', desc: 'Qualquer pessoa pode ver seu perfil', enabled: true },
            { label: 'Mostrar jogos na biblioteca', desc: 'Exibe sua biblioteca de jogos para visitantes', enabled: true },
            { label: 'Mostrar conquistas', desc: 'Exibe suas conquistas desbloqueadas', enabled: true },
            { label: 'Mostrar tempo de jogo', desc: 'Exibe horas totais jogadas', enabled: false },
            { label: 'Mostrar estatísticas', desc: 'Exibe estatísticas de conclusão, platina, etc.', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
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

      <div className="rounded-2xl border border-white/5 bg-[var(--mdf-surface)] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Dados e cookies</h2>
            <p className="text-xs text-white/50 mt-0.5">Gerencie seus dados pessoais e preferências de rastreamento.</p>
          </div>
        </div>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 text-left text-white transition-colors hover:border-white/20">
            <span>Baixar meus dados</span>
            <Download className="h-4 w-4 text-white/40" />
          </button>
          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 text-left text-white/70 transition-colors hover:border-white/20 hover:text-white">
            <span>Excluir meus dados (LGPD)</span>
            <Trash2 className="h-4 w-4 text-white/40" />
          </button>
          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[var(--mdf-bg)] p-3 text-left text-white/70 transition-colors hover:border-white/20 hover:text-white">
            <span>Gerenciar cookies</span>
            <SettingsIcon className="h-4 w-4 text-white/40" />
          </button>
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

      <div className="pt-6 border-t" style={{ borderColor: 'rgba(248, 113, 113, 0.2)' }}>
        <h2 className="font-display text-lg font-bold mb-1" style={{ color: '#f87171' }}>Zona de Perigo</h2>
        <p className="text-sm mb-4 text-white/50">Excluir sua conta apagará todos os seus logs permanentemente.</p>
        <div className="space-y-3">
          <button onClick={() => setShowWipeConfirm(true)} disabled={wiping} className="w-full text-center py-3 rounded-xl text-sm font-bold transition-colors" style={{ background: 'rgba(250,204,21,0.1)', color: '#eab308', border: '1px solid rgba(250,204,21,0.3)' }}>
            {wiping ? 'Limpando...' : 'Limpar Dados (manter avatar, banner, cor)'}
          </button>
          <button className="w-full text-center py-3 rounded-xl text-sm font-bold transition-colors" style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' }} onClick={() => setShowDeleteConfirm(true)}>
            Excluir Conta
          </button>
        </div>
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
              <p className="text-sm" style={{ color: '#eab308' }}>Logs, reviews, conquistas, notificações e badges serão apagados. Avatar, banner, cor de destaque e badge dev serão mantidos.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowWipeConfirm(false)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white" disabled={wiping}>Cancelar</button>
              <button onClick={handleWipeData} disabled={wiping} className="flex-1 rounded-xl bg-yellow-500/20 px-4 py-2.5 text-sm font-bold text-yellow-400 transition-colors hover:bg-yellow-500/30 border border-yellow-500/30">{wiping ? 'Limpando...' : 'Limpar Dados'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;