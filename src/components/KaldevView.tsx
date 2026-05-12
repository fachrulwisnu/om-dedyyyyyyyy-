import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { KaldevProject } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Search, 
  Terminal, 
  Clock, 
  Code, 
  Activity, 
  AlertCircle, 
  TrendingUp,
  User,
  Zap,
  CheckCircle2,
  ExternalLink,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function KaldevView() {
  const [data, setData] = useState<KaldevProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchKaldevData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kaldev_projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setData(data || []);
    } catch (error: any) {
      console.error("Error fetching Kaldev data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKaldevData();
    
    // Setup real-time subscription
    const channel = supabase
      .channel('kaldev_changes')
      .on('postgres_changes', { event: '*', table: 'kaldev_projects', schema: 'public' }, () => {
        fetchKaldevData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticket_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.programmer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  if (loading && data.length === 0) {
    return (
      <div className="h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Kaldev Stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] p-8 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 group hover:rotate-6 transition-transform">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
              Om Dedy <span className="text-indigo-500">Kaldev</span>
            </h1>
            <p className="text-[10px] text-indigo-400 font-black tracking-widest uppercase mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Integration Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Kaldev Projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1f30] border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-80 transition-all"
            />
          </div>
          
          <button 
            onClick={() => window.open('/api-docs', '_blank')}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            API Docs
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredData.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-[#1a1f30] border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition-all relative overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-mono font-bold text-indigo-400 border border-white/5">
                  {project.ticket_id}
                </span>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-slate-600" />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Live Sync</span>
                </div>
              </div>

              {/* Title & Info */}
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-[2.5rem] mb-4">
                {project.project_name}
              </h3>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                  <span className="text-[10px] font-black text-indigo-400">{project.progress_percent || 0}%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress_percent || 0}%` }}
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 mb-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Status Kaldev</span>
                  <span className="text-[10px] font-bold text-white uppercase truncate">{project.status_kaldev || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Programmer</span>
                  <span className="text-[10px] font-bold text-white uppercase truncate">{project.programmer_name || 'Unassigned'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Mandays</span>
                  <span className="text-[10px] font-bold text-white uppercase">{project.mandays || 0}d</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-1">Realized</span>
                  <span className={cn("text-[10px] font-bold uppercase", (project.realized_days || 0) > (project.mandays || 0) ? "text-rose-400" : "text-emerald-400")}>
                    {project.realized_days || 0}d
                  </span>
                </div>
              </div>

              {/* Project Diajukan Section */}
              <div className="mt-3 pt-3 border-t border-white/5 mb-4">
                <div className="flex items-start gap-2 text-[11px]">
                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-slate-500 font-semibold uppercase text-[9px]">Project Diajukan</span>
                    <span className="text-slate-300 line-clamp-2 italic" title={project.project_diajukan || "Belum ada informasi"}>
                      {project.project_diajukan || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {project.is_asap && (
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black rounded border border-rose-500/20 uppercase tracking-widest italic animate-pulse">ASAP</span>
                )}
                {project.is_late && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded border border-amber-500/20 uppercase tracking-widest">LATE</span>
                )}
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black rounded border border-indigo-500/20 uppercase tracking-widest">{project.priority || 'Normal'}</span>
              </div>

              {/* Last Sync Info */}
              <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-mono text-slate-600">Updated: {new Date(project.updated_at).toLocaleTimeString()}</span>
              </div>

              {/* Background Glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredData.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 select-none grayscale">
            <TrendingUp className="w-20 h-20 mb-4" />
            <p className="font-black uppercase tracking-[0.5em] text-xl">No Kaldev Streams</p>
          </div>
        )}
      </div>
    </div>
  );
}
