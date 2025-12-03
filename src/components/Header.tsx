import { Shield, Upload, Edit3, BarChart3 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'editor' | 'upload' | 'dashboard';
  onTabChange: (tab: 'editor' | 'upload' | 'dashboard') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="glass-card border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold gradient-text">
                IT Audit Fraud Detector
              </h1>
              <p className="text-xs text-muted-foreground">
                Dana Pensiun Assessment Tool
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 bg-secondary/50 p-1 rounded-xl">
            <TabButton
              active={activeTab === 'editor'}
              onClick={() => onTabChange('editor')}
              icon={<Edit3 className="w-4 h-4" />}
              label="Editor Manual"
            />
            <TabButton
              active={activeTab === 'upload'}
              onClick={() => onTabChange('upload')}
              icon={<Upload className="w-4 h-4" />}
              label="Upload Excel"
            />
            <TabButton
              active={activeTab === 'dashboard'}
              onClick={() => onTabChange('dashboard')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Dashboard"
            />
          </nav>
        </div>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
