import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { NotionApiProject } from '../types';
import { motion, AnimatePresence } from 'motion/react';
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

export default function KanbanNotionAPI() {
  const [data, setData] = useState<NotionApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(MIGRATION_STATUSES);
  const [selectedProject, setSelectedProject] = useState<NotionApiProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSyncedData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notion_api_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setData(data || []);
    } catch (err: any) {
      console.error("Error fetching synced data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncedData();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      counts[item.last_status] = (counts[item.last_status] || 0) + 1;
    });
    return counts;
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticket_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [data, searchQuery]);

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleCardClick = (project: NotionApiProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Data Stream...</p>
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
          <div className="text-2xl font-black text-white">{data.length}</div>
          {selectedStatuses.length === MIGRATION_STATUSES.length && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>

        {MIGRATION_STATUSES.slice(0, 13).map((status) => {
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

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar">
        {MIGRATION_STATUSES.filter(s => selectedStatuses.includes(s)).map((status) => {
          const statusProjects = filteredData.filter(p => p.last_status === status);
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
                    statusProjects.map((project) => (
                      <motion.div
                        key={project.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -2 }}
                        onClick={() => handleCardClick(project)}
                        className="bg-[#1a1f30] border border-white/5 p-4 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-all shadow-lg group relative overflow-hidden"
                      >
                         <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                                {project.ticket_id || 'NOT_SIGNED'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                 <Clock className="w-2.5 h-2.5 text-slate-600" />
                                 <span className="text-[8px] font-black text-slate-600 uppercase">
                                   {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-'}
                                 </span>
                              </div>
                            </div>
                            
                            <h4 className="text-[12px] font-bold text-white group-hover:text-indigo-400 mb-3 line-clamp-2 leading-tight">
                              {project.project_name}
                            </h4>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                               <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                                 {project.pic_name?.charAt(0) || '?'}
                               </div>
                               <div className="flex flex-col">
                                 <span className="text-[10px] font-bold text-slate-400 leading-none mb-1">{project.pic_name}</span>
                                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">
                                   {project.owner_div || 'GENERAL'}
                                 </span>
                               </div>
                            </div>
                         </div>
                         
                         {/* Subtle Background Glow */}
                         <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    ))
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

