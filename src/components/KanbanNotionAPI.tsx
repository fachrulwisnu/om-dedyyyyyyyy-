import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { NotionApiProject } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  Database, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Loader2,
  Calendar,
  User as UserIcon,
  LayoutGrid,
  FileText,
  Clock,
  CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MIGRATION_STATUSES, STATUS_COLORS } from '../constants/migration';
import ViewDetailModal from './ViewDetailModal';

const CATEGORY_ORDER = [
  "PROJECT UTAMA",
  "ENHANCE KECIL",
  "APPROVAL DIGITAL",
  "INTERNAL IT",
  "ANTRIAN PROJECT UTAMA",
  "ANTRIAN ENHANCE KECIL",
  "HOLD PROJECT UTAMA",
  "HOLD ENHANCE KECIL",
  "UNCATEGORIZED"
];

export default function KanbanNotionAPI() {
  const [data, setData] = useState<NotionApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(MIGRATION_STATUSES);
  const [selectedProject, setSelectedProject] = useState<NotionApiProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { session, currentUser, loading: authLoading } = useAuth();
  const isPublicView = !session && !currentUser;

  useEffect(() => {
    const isLoggedIn = !isPublicView;
    const userIdentifier = session?.user?.email || currentUser?.email || "Unknown";
    console.log("Current Auth State:", isLoggedIn ? `Logged in as ${userIdentifier}` : "Not Logged In");
  }, [session, currentUser, isPublicView]);

  const fetchSyncedData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notion_api_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setData(data || []);
      // Task 4: Log streams found in DB
      const uniqueStreams = Array.from(new Set((data || []).map(p => {
        const raw = p.raw_data || {};
        return (raw["Type Project"] || "UNCATEGORIZED").trim().toUpperCase();
      })));
      console.log("Streams found in DB:", uniqueStreams);
    } catch (err: any) {
      console.error("Error fetching synced data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncedData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const raw = item.raw_data || {};
      const projectType = (raw["Type Project"] || "UNCATEGORIZED").trim().toUpperCase();
      const status = (item.last_status || "").trim().toUpperCase();

      // SECURITY: Privacy Gate for Public View
      if (isPublicView) {
        // 1. Hide specific categories (INTERNAL IT & UNCATEGORIZED)
        const isInternalStream = ["INTERNAL IT", "UNCATEGORIZED"].includes(projectType);
        if (isInternalStream) return false;
        
        // 2. Hide Canceled projects
        if (status === "CANCELED") return false;
      }

      const matchesSearch = 
        item.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticket_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatuses.includes(item.last_status);
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, selectedStatuses, isPublicView]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(item => {
      counts[item.last_status] = (counts[item.last_status] || 0) + 1;
    });
    return counts;
  }, [filteredData]);

  const groupedProjects = useMemo(() => {
    return filteredData.reduce((acc, project) => {
      const raw = project.raw_data || {};
      const type = (raw["Type Project"] || "UNCATEGORIZED").trim().toUpperCase();
      
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(project);
      return acc;
    }, {} as Record<string, NotionApiProject[]>);
  }, [filteredData]);

  const sortedCategories = useMemo(() => {
     return Object.keys(groupedProjects).sort();
  }, [groupedProjects]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const KanbanBoardRenderer = ({ projects }: { projects: NotionApiProject[] }) => {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {MIGRATION_STATUSES.filter(s => selectedStatuses.includes(s)).map((status) => {
          const statusProjects = projects.filter(p => p.last_status === status);
          const colorClass = STATUS_COLORS[status] || 'bg-slate-900 border-slate-700';

          return (
            <div key={status} className="flex-shrink-0 w-80">
              <div className={cn(
                "p-4 rounded-t-2xl border-x border-t border-white/5 flex items-center justify-between sticky top-0 z-10 bg-[#0a0f1d]",
                "before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0.5",
                colorClass.split(' ')[0]
              )}>
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", colorClass.split(' ')[0])} />
                  {status}
                </h3>
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] font-black text-slate-400">
                  {statusProjects.length}
                </span>
              </div>
              
              <div className="bg-[#1a1f30]/40 border-x border-b border-white/5 rounded-b-2xl p-3 min-h-[500px] flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {statusProjects.length > 0 ? (
                    statusProjects.map((project) => {
                      const raw = project.raw_data || {};
                      const projectName = raw["Project Name"] || project.project_name || "Unknown Project";
                      const ticketId = raw["Ticket"] || project.ticket_id || "-";
                      const picName = raw["PIC Name"] || "-";
                      const ownerName = raw["Owner Name"] || "-";
                      const ownerDiv = raw["Owner Div"] || "-";

                      const fpsApproved = raw["Tgl FPS disetujui"] || "-";
                      const fsdPlan = raw["(FSD) Plan in Week"] || "-";
                      const fsdStatus = raw["(FSD) Status"] || "-";
                      const devPlan = raw["(Dev) Plan in Week"] || "-";
                      const devReal = raw["(Dev) Realized In Date"] || "-";
                      const uatBatch = raw["(UAT) Batch\nMisal isinya :\n1 (23-11-2021)\n2 (29-11-2021, dilanjutkan 02-12-2021)"] || raw["(UAT) Batch"] || "-";
                      const uatLate = raw["(UAT) Late Days"] || "-";
                      const liveRealized = raw["(Live) Realized in Date"] || "-";

                      return (
                        <motion.div
                          key={project.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ y: -2 }}
                          onClick={() => handleCardClick(project)}
                          className="bg-[#1a1f30] border border-white/10 p-4 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-all shadow-xl group relative overflow-hidden flex flex-col h-full max-h-[340px]"
                        >
                          <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded">#{ticketId}</span>
                              <span className="text-[10px] text-slate-500 font-bold">{raw["Kuartal"] || ""}</span>
                            </div>
                            <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                              {projectName}
                            </h3>
                            
                            <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                              <p className="truncate"><span className="text-indigo-400/80 font-bold">PIC:</span> {picName}</p>
                              <p className="truncate"><span className="text-indigo-400/80 font-bold">OWNER:</span> {ownerName} • {ownerDiv}</p>
                            </div>
                            
                            <div className="border-t border-white/5 my-3"></div>
                            
                            <div className="grid grid-cols-[40px_1fr] gap-y-2.5 text-[11px] text-slate-300 mt-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <span className="font-bold text-sky-400 uppercase text-[9px] tracking-widest mt-[2px]">FPS:</span>
                              <span className="line-clamp-2 leading-snug">{fpsApproved}</span>
                              
                              <span className="font-bold text-purple-400 uppercase text-[9px] tracking-widest mt-[2px]">FSD:</span>
                              <span className="line-clamp-2 leading-snug">Plan: {fsdPlan} | {fsdStatus}</span>
                              
                              <span className="font-bold text-orange-400 uppercase text-[9px] tracking-widest mt-[2px]">DEV:</span>
                              <span className="line-clamp-2 leading-snug">Plan: {devPlan} | Real: {devReal}</span>
                              
                              <span className="font-bold text-pink-400 uppercase text-[9px] tracking-widest mt-[2px]">UAT:</span>
                              <span className="line-clamp-2 leading-snug">Batch: {uatBatch} | Late: {uatLate}</span>
                              
                              <span className="font-bold text-emerald-400 uppercase text-[9px] tracking-widest mt-[2px]">LIVE:</span>
                              <span className="line-clamp-2 leading-snug">{liveRealized}</span>
                            </div>
                          </div>
                          
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/5 rounded-2xl"
                    >
                      <Database className="w-8 h-8 mb-2 text-slate-700" />
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">
                        NO PROJECTS IN<br/>THIS LANE
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync-notion', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        await fetchSyncedData();
      } else {
        console.error("Sync failed:", result.error);
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleCardClick = (project: NotionApiProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  if (loading || authLoading) {
    return (
      <div className="h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            {authLoading ? "Verifying Session..." : "Initializing Data Stream..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0a0f1d] min-h-screen text-slate-300">
       {/* Header */}
       <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Kanban <span className="text-indigo-500">Notion API</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Synchronized Data Repository • API Execution Output
            </p>
          </div>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            "px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2",
            syncing && "opacity-70 cursor-not-allowed"
          )}
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Synchronizing...
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Synchronize Now
            </>
          )}
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-8">
         <button 
          onClick={() => setSelectedStatuses(MIGRATION_STATUSES)}
          className={cn(
             "p-3 rounded-xl border text-left transition flex flex-col justify-between h-24 relative overflow-hidden group",
            selectedStatuses.length === MIGRATION_STATUSES.length ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/20" : "bg-[#1a1f30] border-gray-700 hover:border-gray-500"
          )}
        >
          <div className={cn("text-[10px] font-black uppercase tracking-widest", selectedStatuses.length === MIGRATION_STATUSES.length ? "text-white/60" : "text-slate-500")}>TOTAL PROJECTS</div>
          <div className="text-2xl font-black text-white">{filteredData.length}</div>
          {selectedStatuses.length === MIGRATION_STATUSES.length && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>

        {MIGRATION_STATUSES.filter(s => {
          if (isPublicView && s.toUpperCase() === 'CANCELED') return false;
          return true;
        }).map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = selectedStatuses.includes(status);
          return (
            <button 
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={cn(
                "p-3 rounded-xl border text-left transition flex flex-col justify-between h-24 relative group",
                isActive ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/40" : "bg-[#1a1f30] border-white/5 hover:border-white/10"
              )}
            >
              <div className={cn("text-[10px] font-black uppercase tracking-widest line-clamp-2 leading-tight min-h-[24px]", isActive ? "text-white/60" : "text-slate-500")}>
                {status}
              </div>
              <div className="text-2xl font-black text-white">{count}</div>
              {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Control Bar */}
      <div className="bg-[#1a1f30] border border-white/5 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search Project Name or Ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
          />
        </div>
        <div className="md:w-64">
           <div className="h-full flex items-center px-4 bg-black/10 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
             {selectedStatuses.length} Statuses Active In Board
           </div>
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="space-y-4 mt-6 pb-20">
        {CATEGORY_ORDER.map(category => {
          // Dynamic Stream Filtering
          const isInternal = ["INTERNAL IT", "UNCATEGORIZED"].includes(category.toUpperCase());
          if (isInternal && isPublicView) return null;

          const categoryProjects = groupedProjects[category] || [];
          
          // Hide the accordion completely if there are no projects in it
          if (categoryProjects.length === 0) return null;

          const isExpanded = expandedCategories[category];
          
          return (
            <div key={category} className="bg-[#121520] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              {/* Accordion Header */}
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-5 bg-[#16192B] hover:bg-[#1E2238] transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300",
                    isExpanded ? "bg-indigo-600 text-white rotate-90" : "bg-white/5 text-slate-500"
                  )}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-white tracking-widest uppercase italic text-sm">{category}</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Operational Category Stream
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-600/10 text-indigo-400 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                    {categoryProjects.length} PROJECTS
                  </span>
                </div>
              </button>

              {/* Accordion Content (The Kanban Board) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="p-6 bg-[#0a0f1d] overflow-x-auto border-t border-white/5">
                      <KanbanBoardRenderer projects={categoryProjects} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <ViewDetailModal 
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
      />
    </div>
  );
}

