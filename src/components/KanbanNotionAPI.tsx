import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { MigrateNotion } from '../types';
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
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MIGRATION_STATUSES, STATUS_COLORS } from '../constants/migration';

export default function KanbanNotionAPI() {
  const [data, setData] = useState<MigrateNotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(item.last_status);
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilters]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
         <button 
          onClick={() => setStatusFilters([])}
          className={cn(
             "p-3 rounded-xl border text-left transition flex flex-col justify-between h-24 relative overflow-hidden group",
            statusFilters.length === 0 ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/20" : "bg-[#1a1f30] border-gray-700 hover:border-gray-500"
          )}
        >
          <div className={cn("text-[10px] font-black uppercase tracking-widest", statusFilters.length === 0 ? "text-white/60" : "text-slate-500")}>TOTAL PROJECTS</div>
          <div className="text-2xl font-black text-white">{data.length}</div>
          {statusFilters.length === 0 && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>

        {MIGRATION_STATUSES.slice(0, 13).map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = statusFilters.includes(status);
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
           {/* Multi-select filter placeholder or just use the status cards above */}
           <div className="h-full flex items-center px-4 bg-black/10 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
             {statusFilters.length} Statuses Selected
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#1a1f30] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Ticket ID</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Project Name</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">PIC</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Last Log Update</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-center">Sync Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="group border-b border-white/5 hover:bg-indigo-600/5 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                      {item.ticket_id || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {item.project_name}
                      </span>
                      <span className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">
                        {item.owner_div || 'GENERAL'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      STATUS_COLORS[item.last_status] || 'bg-slate-900 text-slate-500 border-slate-700'
                    )}>
                      {item.last_status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                         {item.pic_name?.charAt(0) || '?'}
                       </div>
                       <span className="text-[11px] font-bold text-slate-400">{item.pic_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[11px] text-slate-500 italic line-clamp-2 max-w-[300px] whitespace-pre-wrap leading-relaxed">
                      {item.last_update_log || 'No log provided'}
                    </p>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      <span className="text-[9px] font-bold text-slate-600 uppercase">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20 select-none">
                      <Database className="w-16 h-16 mb-4" />
                      <p className="font-black uppercase tracking-[0.4em] text-sm">Synchronized Stream Empty</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
