import type { User } from '../types';
import { Clock } from 'lucide-react';

interface TimelinePageProps {
  user: User;
}

const TimelinePage = ({ user }: TimelinePageProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight">Timeline</h1>
        <div className="text-white/50 text-sm mt-1">@{user.username} · Em breve</div>
      </div>

      <div className="mdf-card p-12 text-center">
        <Clock size={48} className="mx-auto mb-4 text-white/20" />
        <h3 className="font-display text-xl font-bold text-white/60 mb-2">Em desenvolvimento</h3>
        <p className="text-sm text-white/40 max-w-md mx-auto">
          A timeline vai mostrar as atividades dos seus seguidores em tempo real.
          Em breve você poderá seguir outros usuários e ver o que estão assistindo, jogando e lendo.
        </p>
      </div>
    </div>
  );
};

export default TimelinePage;
