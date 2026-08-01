import { STATUS_ICONS } from '../constants/designSystem';

interface StatusIconProps {
  status?: string | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const StatusIcon = ({ status, size = 12, strokeWidth = 2.5, className }: StatusIconProps) => {
  if (!status) return null;
  const Icon = STATUS_ICONS[status];
  if (!Icon) return <span className="text-[10px] font-bold">{status.charAt(0).toUpperCase()}</span>;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
};

export default StatusIcon;
