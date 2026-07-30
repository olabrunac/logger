import { useState } from 'react';
import { GripVertical, Eye, EyeOff, X, Plus, ChevronUp, ChevronDown, Save } from 'lucide-react';

interface SectionDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  visible?: boolean;
}

interface LayoutEditorModalProps {
  sections: SectionDef[];
  availableSections: SectionDef[];
  onSave: (sections: { id: string; visible: boolean }[]) => Promise<void>;
  onClose: () => void;
}

const LayoutEditorModal = ({ sections: initialSections, availableSections, onSave, onClose }: LayoutEditorModalProps) => {
  const [items, setItems] = useState<SectionDef[]>(() => {
    const configMap = new Map(initialSections.map(s => [s.id, s.visible ?? true]));
    const order = initialSections.map(s => s.id);
    return availableSections
      .map(s => ({ ...s, visible: configMap.has(s.id) ? configMap.get(s.id)! : (s.visible ?? true) }))
      .sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
  });
  const [saving, setSaving] = useState(false);

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggleVisibility = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, visible: !item.visible } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const visibleIds = items.filter(s => s.visible).map(s => s.id);
  const hiddenAvailables = availableSections.filter(s => !visibleIds.includes(s.id) && !items.some(i => i.id === s.id));

  const addSection = (section: SectionDef) => {
    setItems(prev => [...prev, { ...section, visible: true }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map(s => ({ id: s.id, visible: s.visible })));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold text-white">Editar Layout do Perfil</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/10 text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5 mb-4">
          {items.map((section, index) => (
            <div key={section.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors" style={{ background: section.visible ? 'var(--bg-card)' : 'var(--bg)' }}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveItem(index, index - 1)} disabled={index === 0} className="p-0.5 rounded text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => moveItem(index, index + 1)} disabled={index === items.length - 1} className="p-0.5 rounded text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronDown size={12} />
                </button>
              </div>
              <GripVertical size={14} className="text-white/20 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {section.icon && <span className="flex-shrink-0 text-white/40">{section.icon}</span>}
                <span className={`text-sm font-medium truncate ${section.visible ? 'text-white/80' : 'text-white/30'}`}>{section.label}</span>
              </div>
              <button onClick={() => toggleVisibility(index)} className={`p-1.5 rounded-lg transition-colors ${section.visible ? 'text-white/60 hover:bg-white/10' : 'text-white/20 hover:bg-white/5'}`} title={section.visible ? 'Ocultar' : 'Mostrar'}>
                {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => removeItem(index)} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remover">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {hiddenAvailables.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Plus size={12} className="text-white/30" />
              <span className="text-xs font-medium text-white/30 uppercase tracking-wider">Adicionar bloco</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hiddenAvailables.map(section => (
                <button key={section.id} onClick={() => addSection(section)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 text-white/50 hover:text-white/80"
                  style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
                  {section.icon && <span className="text-white/40">{section.icon}</span>}
                  {section.label}
                  <Plus size={10} className="text-white/30" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10 text-white/60">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditorModal;
