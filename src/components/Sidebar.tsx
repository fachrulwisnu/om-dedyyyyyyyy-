import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  Activity, 
  LayoutGrid, 
  Calendar, 
  History, 
  Users, 
  FolderKanban, 
  ShieldAlert, 
  ShieldCheck,
  LogOut, 
  LogIn,
  ChevronLeft, 
  ChevronRight,
  Zap,
  ChevronDown,
  ChevronUp,
  Database,
  RefreshCw,
  Table
} from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: any;
  activeView: string;
  onLogout: () => void;
  pendingRescheduleCount: number;
  selectedProjectId?: string | null;
}

export function Sidebar({ 
  isOpen, 
  setIsOpen, 
  user, 
  activeView, 
  onLogout, 
  pendingRescheduleCount,
  selectedProjectId
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = user?.access_level || 'PIC';

  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isNotionExpanded, setIsNotionExpanded] = useState(true);
  const [isExternalExpanded, setIsExternalExpanded] = useState(true);
  const [isAdminExpanded, setIsAdminExpanded] = useState(true);

  // 1. OM DEDY PROJECT LIST
  const projectSubItems = [
    { id: 'PROJECTS', label: 'OM DEDY PROJECT LIST', icon: LayoutDashboard, path: '/portofolio' },
    { id: 'GANTT_DETAIL', label: 'PROJECT DETAIL TIMELINE', icon: BarChart3, path: '/detail-timeline' },
    { id: 'TIMELINE', label: 'OM DEDY TIMELINE', icon: Activity, path: '/timeline' },
    { id: 'TOR_MONITOR', label: 'OM DEDY TOR MONITOR', icon: ShieldCheck, path: '/tor-monitor', roles: ['Admin', 'Superadmin'] },
  ];

  // 2. OM DEDY NOTION (API Sync)
  const notionSubItems = [
    { id: 'NOTION_MIGRATE', label: 'OM DEDY MIGRATE NOTION', icon: Database, path: '/notion-migrate', roles: undefined },
    { id: 'NOTION_MONITORING', label: 'OM DEDY NOTION MONITORING', icon: LayoutGrid, path: '/notion-monitoring', roles: undefined },
    { id: 'NOTION_API_RESULTS', label: 'KANBAN NOTION API', icon: Table, path: '/notion-api-results', roles: undefined },
    { id: 'NOTION_API', label: 'OM DEDY NOTION API', icon: RefreshCw, path: '/notion-api', roles: ['Admin', 'Superadmin'] },
  ];

  // 3. EXTERNAL INTEGRATION
  const externalSubItems = [
    { id: 'OM_DEDY_KALDEV', label: 'OM DEDY KALDEV', icon: Zap, path: '/kaldev', roles: undefined },
    { id: 'API_DOCS', label: 'API DOCUMENTATION', icon: Database, path: '/api-docs', roles: undefined },
  ];

  // 4. ADMINISTRATIVE
  const adminSubItems = [
    { id: 'SCHEDULE', label: 'OM DEDY SCHEDULE', icon: Calendar, path: '/schedule', roles: undefined },
    { id: 'RESCHEDULE', label: 'APPROVALS', icon: History, path: '/approvals', roles: ['Admin', 'Superadmin'], badgeCount: pendingRescheduleCount },
    { id: 'PERSONEL', label: 'PERSONEL OM DEDY', icon: Users, path: '/personnel', roles: ['Admin', 'Superadmin'] },
    { id: 'AUDIT', label: 'SYSTEM AUDIT LOGS', icon: ShieldAlert, path: '/audit', roles: ['Admin', 'Superadmin'] },
  ];

  const mainMenuItems = [
    { id: 'KANBAN', label: 'Status Monitoring', icon: LayoutGrid, path: '/kanban' },
    { id: 'MASTER_PROJECT', label: 'OM DEDY MASTER PROJECT', icon: FolderKanban, path: '/master-project', roles: ['Admin', 'Superadmin'] },
  ];

  const isProjectMenuActive = projectSubItems.some(item => activeView === item.id);
  const isNotionMenuActive = notionSubItems.some(item => activeView === item.id);
  const isExternalMenuActive = externalSubItems.some(item => activeView === item.id);
  const isAdminMenuActive = adminSubItems.some(item => activeView === item.id);

  // Auto-expand if sub-menu is active
  useEffect(() => {
    if (isProjectMenuActive) setIsProjectsExpanded(true);
    if (isNotionMenuActive) setIsNotionExpanded(true);
    if (isExternalMenuActive) setIsExternalExpanded(true);
    if (isAdminMenuActive) setIsAdminExpanded(true);
  }, [isProjectMenuActive, isNotionMenuActive, isExternalMenuActive, isAdminMenuActive]);

  return (
    <aside className={cn(
      "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-40 shrink-0 relative",
      isOpen ? "w-72" : "w-16"
    )}>
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center z-50 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all shadow-xl"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 group cursor-pointer hover:rotate-12 transition-transform">
            <span className="text-lg font-black text-white">OD</span>
          </div>
          {isOpen && (
            <div className="ml-3">
              <h1 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-xl leading-none">
                OM <span className="text-indigo-500">DEDY</span>
              </h1>
              <p className="text-[7px] text-slate-500 font-black tracking-[0.05em] uppercase leading-tight mt-1">
                Operational Monitoring Dashboard
              </p>
            </div>
          )}
        </div>
        {isOpen && <ThemeToggle />}
      </div>

      {/* Navigation */}
      <nav className="py-6 space-y-1 overflow-y-auto scrollbar-hide">
        {/* Main Menu Items */}
        {mainMenuItems.map((item) => (
          <SidebarItem
            key={item.id}
            to={item.path}
            label={item.label}
            icon={item.icon}
            isOpen={isOpen}
            isActive={activeView === item.id}
            roles={(item as any).roles}
            userRole={userRole}
            showDot={(item as any).showDot}
          />
        ))}

        <div className="h-px bg-slate-200 dark:bg-slate-800/50 mx-4 my-2" />

        {/* 1. PROJECT LIST */}
        <div className="mb-2">
          <div 
            onClick={() => {
              if (isOpen) setIsProjectsExpanded(!isProjectsExpanded);
              else { setIsOpen(true); setIsProjectsExpanded(true); }
            }}
            className={cn(
              "w-full flex items-center justify-between py-3 px-4 transition-all relative group cursor-pointer",
              isProjectMenuActive 
                ? "text-indigo-600 dark:text-white bg-gradient-to-r from-indigo-600/10 dark:from-indigo-600/20 to-transparent" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center">
              <LayoutDashboard className={cn("w-5 h-5 shrink-0 transition-colors z-10", isProjectMenuActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
              {isOpen && <span className="ml-4 font-bold text-xs uppercase tracking-widest truncate z-10">Om Dedy Project List</span>}
            </div>
            {isOpen && (isProjectsExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />)}
            {isProjectMenuActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
          </div>
          {isOpen && isProjectsExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
              {projectSubItems.map((item) => (
                <SidebarItem key={item.id} to={item.path} label={item.label} icon={item.icon} isOpen={isOpen} isActive={activeView === item.id} roles={item.roles} userRole={userRole} />
              ))}
            </div>
          )}
        </div>

        {/* 2. OM DEDY NOTION */}
        <div className="mb-2">
          <div 
            onClick={() => {
              if (isOpen) setIsNotionExpanded(!isNotionExpanded);
              else { setIsOpen(true); setIsNotionExpanded(true); }
            }}
            className={cn(
              "w-full flex items-center justify-between py-3 px-4 transition-all relative group cursor-pointer",
              isNotionMenuActive 
                ? "text-indigo-600 dark:text-white bg-gradient-to-r from-indigo-600/10 dark:from-indigo-600/20 to-transparent" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center">
              <Database className={cn("w-5 h-5 shrink-0 transition-colors z-10", isNotionMenuActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
              {isOpen && <span className="ml-4 font-bold text-xs uppercase tracking-widest truncate z-10">Om Dedy Notion</span>}
            </div>
            {isOpen && (isNotionExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />)}
            {isNotionMenuActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
          </div>
          {isOpen && isNotionExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
              {notionSubItems.map((item) => (
                <SidebarItem key={item.id} to={item.path} label={item.label} icon={item.icon} isOpen={isOpen} isActive={activeView === item.id} roles={item.roles} userRole={userRole} />
              ))}
            </div>
          )}
        </div>

        {/* 3. EXTERNAL INTEGRATION */}
        <div className="mb-2">
          <div 
            onClick={() => {
              if (isOpen) setIsExternalExpanded(!isExternalExpanded);
              else { setIsOpen(true); setIsExternalExpanded(true); }
            }}
            className={cn(
              "w-full flex items-center justify-between py-3 px-4 transition-all relative group cursor-pointer",
              isExternalMenuActive 
                ? "text-indigo-600 dark:text-white bg-gradient-to-r from-indigo-600/10 dark:from-indigo-600/20 to-transparent" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center">
              <Zap className={cn("w-5 h-5 shrink-0 transition-colors z-10", isExternalMenuActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
              {isOpen && <span className="ml-4 font-bold text-xs uppercase tracking-widest truncate z-10">External Integration</span>}
            </div>
            {isOpen && (isExternalExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />)}
            {isExternalMenuActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
          </div>
          {isOpen && isExternalExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
              {externalSubItems.map((item) => (
                <SidebarItem key={item.id} to={item.path} label={item.label} icon={item.icon} isOpen={isOpen} isActive={activeView === item.id} roles={item.roles} userRole={userRole} />
              ))}
            </div>
          )}
        </div>

        {/* 4. ADMINISTRATIVE */}
        <div className="mb-2">
          <div 
            onClick={() => {
              if (isOpen) setIsAdminExpanded(!isAdminExpanded);
              else { setIsOpen(true); setIsAdminExpanded(true); }
            }}
            className={cn(
              "w-full flex items-center justify-between py-3 px-4 transition-all relative group cursor-pointer",
              isAdminMenuActive 
                ? "text-indigo-600 dark:text-white bg-gradient-to-r from-indigo-600/10 dark:from-indigo-600/20 to-transparent" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center">
              <Users className={cn("w-5 h-5 shrink-0 transition-colors z-10", isAdminMenuActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
              {isOpen && <span className="ml-4 font-bold text-xs uppercase tracking-widest truncate z-10">Administrative</span>}
            </div>
            {isOpen && (isAdminExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />)}
            {isAdminMenuActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_#6366f1]" />}
          </div>
          {isOpen && isAdminExpanded && (
            <div className="mt-1 ml-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
              {adminSubItems.map((item) => (
                <SidebarItem key={item.id} to={item.path} label={item.label} icon={item.icon} isOpen={isOpen} isActive={activeView === item.id} roles={item.roles} userRole={userRole} badgeCount={item.badgeCount} />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 grow-0 mt-8">
        {isOpen && user ? (
          <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-indigo-500/30 flex items-center justify-center overflow-hidden">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 capitalize">{user.email?.charAt(0) || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{userRole}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-[10px] font-bold uppercase transition-all border border-slate-200 dark:border-transparent"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <ThemeToggle />
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : !user ? (
          <div className={cn("p-2", !isOpen && "flex justify-center")}>
            <button 
              onClick={() => navigate('/login')} 
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20",
                !isOpen && "p-3 w-auto"
              )}
              title="Login to Dashboard"
            >
              <LogIn className={cn("w-5 h-5", isOpen && "w-4 h-4")} /> 
              {isOpen && <span className="text-xs uppercase tracking-widest">Login to Dashboard</span>}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
