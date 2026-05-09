import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { MigrateNotion } from '../types';
import { 
  Database, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  XCircle,
  Loader2,
  Check,
  Clock,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MIGRATION_STATUSES, STATUS_COLORS } from '../constants/migration';

export function NotionMonitoring() {
  const [projects, setProjects] = useState<MigrateNotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<MigrateNotion | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(MIGRATION_STATUSES);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
  const [initialPic, setInitialPic] = useState('');

  const CACHE_KEY = 'om_dedy_notion_monitoring_cache';

  const fetchProjects = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setProjects(JSON.parse(cached));
        setLoading(false);
      }
    }

    try {
      const { data, error } = await supabase
        .from('migrate_notion')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('migrate_notion_logs')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      
      if (!error) setHistoryLogs(data || []);
    } catch (err) {
      console.error('History Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setEditedNotes(selectedProject.last_update_log || '');
      setActiveTab('DETAILS');
      if (selectedProject.ticket_id) {
        fetchHistory(selectedProject.ticket_id);
      }
    }
  }, [selectedProject]);

  const logChange = async (ticketId: string, field: string, oldVal: any, newVal: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('migrate_notion_logs').insert({
        ticket_id: ticketId,
        changed_by: user?.email || 'System',
        field_name: field,
        old_value: String(oldVal),
        new_value: String(newVal),
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Logging Error:', err);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedProject) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('migrate_notion')
        .update({ last_update_log: editedNotes })
        .eq('id', selectedProject.id);

      if (error) throw error;
      
      await logChange(selectedProject.ticket_id || selectedProject.id, 'Notes', selectedProject.last_update_log, editedNotes);
      
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, last_update_log: editedNotes } : p));
      setSelectedProject(prev => prev ? { ...prev, last_update_log: editedNotes } : null);
      if (selectedProject.ticket_id) fetchHistory(selectedProject.ticket_id);
      alert('Notes updated!');
    } catch (err) {
      console.error('Update Error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    MIGRATION_STATUSES.forEach(s => acc[s] = 0);
    projects.forEach(p => {
      if (acc.hasOwnProperty(p.last_status)) acc[p.last_status]++;
    });
    return acc;
  }, [projects]);

  const availablePics = useMemo(() => {
    const pics = new Set(projects.map(p => p.pic_name || 'Unassigned'));
    return Array.from(pics).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let res = projects;
    if (statusFilter) {
      res = res.filter(p => p.last_status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(p => 
        p.project_name.toLowerCase().includes(q) || 
        (p.ticket_id || '').toLowerCase().includes(q) ||
        (p.pic_name || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="h-screen bg-[#0a0f1d] text-slate-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Database className="w-6 h-6 text-indigo-500" />
            Notion <span className="text-indigo-500">Monitoring Board</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Project Synchronization</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => fetchProjects(true)}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            title="Force Refresh Data"
          >
            <Loader2 className={cn("w-4 h-4 text-indigo-400", loading ? "animate-spin" : "")} />
          </button>

          {/* Multi-select Status Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-500/50 transition-all text-slate-300"
            >
              <Filter className="w-4 h-4 text-indigo-500" />
              Monitor Statuses ({selectedStatuses.length})
              <ChevronDown className={cn("w-3 h-3 transition-transform", isFilterOpen ? "rotate-180" : "")} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-[#1a1f30] border border-white/10 rounded-2xl shadow-2xl z-[120] p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Select Columns</span>
                  <button 
                    onClick={() => setSelectedStatuses(selectedStatuses.length === MIGRATION_STATUSES.length ? [] : MIGRATION_STATUSES)}
                    className="text-[8px] font-black text-slate-500 uppercase hover:text-white transition-colors"
                  >
                    {selectedStatuses.length === MIGRATION_STATUSES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {MIGRATION_STATUSES.map(status => (
                    <button 
                      key={status}
                      onClick={() => {
                        setSelectedStatuses(prev => 
                          prev.includes(status) 
                            ? prev.filter(s => s !== status) 
                            : [...prev, status]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                        selectedStatuses.includes(status) ? "bg-indigo-600/20 text-white" : "text-slate-500 hover:bg-white/5"
                      )}
                    >
                      <span className="truncate mr-2">{status}</span>
                      {selectedStatuses.includes(status) && <Check className="w-3 h-3 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="SEARCH ACROSS BOARD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500/50 transition-all w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Summary Filter Cards */}
      <div className="px-6 py-4 bg-[#0a0f1d] border-b border-white/5 flex gap-3 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setStatusFilter(null)}
          className={cn(
             "p-3 rounded-xl border text-left transition flex flex-col justify-between min-w-[140px] h-20 relative overflow-hidden group shrink-0",
            !statusFilter ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/20" : "bg-[#1a1f30] border-white/5 hover:border-white/10"
          )}
        >
          <div className={cn("text-[9px] font-black uppercase tracking-widest", !statusFilter ? "text-white/60" : "text-slate-500")}>ALL PROJECTS</div>
          <div className="text-xl font-black text-white">{projects.length}</div>
          {!statusFilter && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>

        {MIGRATION_STATUSES.map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = statusFilter === status;
          return (
            <button 
              key={status}
              onClick={() => {
                setStatusFilter(isActive ? null : status);
                if (!selectedStatuses.includes(status)) {
                  setSelectedStatuses(prev => [...prev, status]);
                }
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition flex flex-col justify-between min-w-[140px] h-20 relative group shrink-0",
                isActive ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/40" : "bg-[#1a1f30] border-white/5 hover:border-white/10"
              )}
            >
              <div className={cn("text-[9px] font-black uppercase tracking-widest line-clamp-1 leading-tight", isActive ? "text-white/60" : "text-slate-500")}>
                {status}
              </div>
              <div className="text-xl font-black text-white">{count}</div>
              {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-x-auto p-6 scrollbar-hide">
        {selectedStatuses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
             <Filter className="w-16 h-16 opacity-10" />
             <div className="text-center">
               <p className="text-sm font-black uppercase tracking-[0.2em]">Board Empty</p>
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Please select at least one status to monitor.</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-wrap lg:flex-nowrap gap-4 items-start h-full min-w-max">
            {selectedStatuses.map(status => {
              const laneProjects = filteredProjects.filter(p => p.last_status === status);
              const colorClass = STATUS_COLORS[status] || 'bg-gray-800 text-gray-300 border-gray-600';
              const borderClass = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-white/5';

              return (
                <div key={status} className={cn(
                  "w-full md:w-80 flex-shrink-0 flex flex-col bg-[#121620]/50 border border-white/5 rounded-2xl max-h-full shadow-2xl transition-all",
                  statusFilter === status ? "ring-2 ring-indigo-500/50 shadow-indigo-500/10" : "shadow-black/40"
                )}>
                  {/* Lane Header with color-coded accent */}
                  <div className={cn(
                    "p-4 border-b-2 flex items-center justify-between bg-[#1a1f30] rounded-t-2xl sticky top-0 z-10",
                    borderClass
                  )}>
                    <h3 className={cn("font-black text-[10px] uppercase tracking-widest truncate flex-1 pr-2", colorClass.split(' ')[1])}>
                      {status}
                    </h3>
                    <span className="px-2 py-1 rounded-lg bg-black/40 text-[9px] font-black text-white shadow-inner">
                      {laneProjects.length}
                    </span>
                  </div>

                  {/* Card Container */}
                  <div className="p-3 overflow-y-auto space-y-3 custom-scrollbar flex-1 max-h-[calc(100vh-320px)]">
                  {laneProjects.map(project => (
                    <div 
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className="bg-[#1a1f30] border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer group hover:shadow-xl hover:shadow-indigo-500/5"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-white font-bold text-xs leading-tight group-hover:text-indigo-400 transition-colors line-clamp-2 pr-2">{project.project_name}</h4>
                        <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-500 shrink-0 mt-1" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black border border-white/10">
                            {project.pic_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[100px]">{project.pic_name}</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-700 bg-black/20 px-1.5 py-0.5 rounded uppercase">{project.ticket_id || '---'}</div>
                      </div>

                      {project.last_update_log && (
                        <p className="text-[9px] text-slate-500 italic line-clamp-2 border-t border-white/5 pt-2 leading-relaxed">
                          {project.last_update_log}
                        </p>
                      )}
                    </div>
                  ))}
                  {laneProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                      <Database className="w-8 h-8 mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest">No Projects</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Reusable Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0f1423] border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-white/5 flex items-start justify-between">
               <div className="flex-1 mr-6">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <input 
                      value={selectedProject.ticket_id || ''}
                      onChange={async (e) => {
                        const newVal = e.target.value;
                        const { error } = await supabase.from('migrate_notion').update({ ticket_id: newVal }).eq('id', selectedProject.id);
                        if (!error) {
                          await logChange(newVal || selectedProject.id, 'Ticket ID', selectedProject.ticket_id, newVal);
                          setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ticket_id: newVal } : p));
                          setSelectedProject(prev => prev ? { ...prev, ticket_id: newVal } : null);
                        }
                      }}
                      placeholder="TICKET-ID"
                      className="px-3 py-1 bg-indigo-600 rounded text-[10px] font-black text-white uppercase placeholder:text-white/40 border-none outline-none w-32"
                    />
                    <div className="relative group/status">
                      <select 
                        value={selectedProject.last_status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const { error } = await supabase.from('migrate_notion').update({ last_status: newStatus }).eq('id', selectedProject.id);
                          if (!error) {
                            await logChange(selectedProject.ticket_id || selectedProject.id, 'Status', selectedProject.last_status, newStatus);
                            setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, last_status: newStatus } : p));
                            setSelectedProject(prev => prev ? { ...prev, last_status: newStatus } : null);
                          }
                        }}
                        className={cn(
                          "text-[10px] px-3 py-1 rounded-lg border font-black uppercase tracking-widest bg-transparent cursor-pointer appearance-none pr-8 outline-none",
                          STATUS_COLORS[selectedProject.last_status]
                        )}
                      >
                        {MIGRATION_STATUSES.map(s => <option key={s} value={s} className="bg-slate-900 text-white uppercase font-black">{s}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-current pointer-events-none" />
                    </div>
                  </div>
                  <input 
                    value={selectedProject.project_name}
                    onChange={async (e) => {
                       const newVal = e.target.value;
                       const { error } = await supabase.from('migrate_notion').update({ project_name: newVal }).eq('id', selectedProject.id);
                       if (!error) {
                         setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_name: newVal } : p));
                         setSelectedProject(prev => prev ? { ...prev, project_name: newVal } : null);
                       }
                    }}
                    onBlur={() => logChange(selectedProject.ticket_id || selectedProject.id, 'Project Name', '', selectedProject.project_name)}
                    className="text-2xl font-black text-white bg-transparent border-none outline-none w-full hover:bg-white/5 rounded px-1 transition-colors"
                  />
               </div>
               <button onClick={() => setSelectedProject(null)} className="p-3 hover:bg-rose-500/20 rounded-2xl transition-all">
                 <XCircle className="w-6 h-6 text-slate-500" />
               </button>
            </div>

            {/* Tabs */}
            <div className="flex px-8 border-b border-white/5">
              <button 
                onClick={() => setActiveTab('DETAILS')}
                className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                  activeTab === 'DETAILS' ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                PROPERTIES & NOTES
                {activeTab === 'DETAILS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
              </button>
              <button 
                onClick={() => setActiveTab('HISTORY')}
                className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                  activeTab === 'HISTORY' ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                HISTORY LOG ({historyLogs.length})
                {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeTab === 'DETAILS' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Main Assignment</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                          <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">PIC Name</label>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-white">
                              {selectedProject.pic_name.charAt(0)}
                            </div>
                            <div className="relative group/pic">
                              <input 
                                value={selectedProject.pic_name}
                                onFocus={(e) => setInitialPic(e.target.value)}
                                onChange={async (e) => {
                                  const newVal = e.target.value;
                                  setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, pic_name: newVal } : p));
                                  setSelectedProject(prev => prev ? { ...prev, pic_name: newVal } : null);
                                }}
                                onBlur={async () => {
                                  const newVal = selectedProject.pic_name;
                                  if (newVal === initialPic) return;
                                  
                                  const { error } = await supabase.from('migrate_notion').update({ pic_name: newVal }).eq('id', selectedProject.id);
                                  if (!error) {
                                    await logChange(selectedProject.ticket_id || selectedProject.id, 'PIC Name', initialPic, newVal);
                                    localStorage.removeItem(CACHE_KEY);
                                  }
                                }}
                                list="pic-suggestions-monitor"
                                className="bg-transparent border-none outline-none font-bold text-white w-full text-lg"
                                placeholder="Assign PIC..."
                              />
                              <datalist id="pic-suggestions-monitor">
                                {availablePics.map(pic => (
                                  <option key={pic} value={pic} />
                                ))}
                              </datalist>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/pic:opacity-100 transition-opacity">
                                <Search className="w-3 h-3 text-indigo-400/50" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Owner Div</label>
                            <input 
                               value={selectedProject.owner_div || ''}
                               onChange={async (e) => {
                                 const newVal = e.target.value;
                                 const { error } = await supabase.from('migrate_notion').update({ owner_div: newVal }).eq('id', selectedProject.id);
                                 if (!error) {
                                   setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, owner_div: newVal } : p));
                                   setSelectedProject(prev => prev ? { ...prev, owner_div: newVal } : null);
                                 }
                               }}
                               className="bg-transparent border-none outline-none font-black text-white w-full uppercase text-xs"
                               placeholder="DIVISI..."
                            />
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                             <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Type</label>
                             <input 
                                value={selectedProject.project_type || ''}
                                onChange={async (e) => {
                                  const newVal = e.target.value;
                                  const { error } = await supabase.from('migrate_notion').update({ project_type: newVal }).eq('id', selectedProject.id);
                                  if (!error) {
                                    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_type: newVal } : p));
                                    setSelectedProject(prev => prev ? { ...prev, project_type: newVal } : null);
                                  }
                                }}
                                className="bg-transparent border-none outline-none font-black text-white w-full uppercase text-xs"
                                placeholder="CATEGORY..."
                             />
                          </div>
                        </div>
                      </div>
                    </section>
                    
                    <section className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Records / Update Logs</label>
                        {isUpdating && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                      </div>
                      <div className="relative group">
                        <textarea 
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          className="w-full h-72 bg-black/40 border border-white/10 rounded-2xl p-6 text-xs text-slate-300 font-medium leading-[1.8] focus:border-indigo-500/50 outline-none resize-none whitespace-pre-wrap transition-all ring-offset-black focus:ring-4 ring-indigo-500/10"
                          placeholder="Type detailed update reports..."
                        />
                        <button 
                          onClick={handleUpdateNotes}
                          disabled={isUpdating || editedNotes === (selectedProject.last_update_log || '')}
                          className="absolute bottom-4 right-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-[10px] font-black uppercase text-white rounded-xl transition-all shadow-2xl shadow-indigo-600/40"
                        >
                          {isUpdating ? 'SAVING...' : 'COMMIT CHANGES'}
                        </button>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Raw Metadata & Properties</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {Object.entries(selectedProject.raw_data || {}).map(([k, v]) => {
                          if (!v || v === 'null') return null;
                          const isSpecial = k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('status');
                          return (
                            <div key={k} className="p-3 bg-white/5 rounded-xl border border-white/5 group/row">
                              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1 opacity-60 group-hover/row:opacity-100 transition-opacity">{k}</span>
                              <input 
                                defaultValue={String(v)}
                                onBlur={async (e) => {
                                  const newVal = e.target.value;
                                  if (newVal === String(v)) return;
                                  const newRaw = { ...selectedProject.raw_data, [k]: newVal };
                                  const { error } = await supabase.from('migrate_notion').update({ raw_data: newRaw }).eq('id', selectedProject.id);
                                  if (!error) {
                                    await logChange(selectedProject.ticket_id || selectedProject.id, `Raw: ${k}`, v, newVal);
                                    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, raw_data: newRaw } : p));
                                    setSelectedProject(prev => prev ? { ...prev, raw_data: newRaw } : null);
                                    if (selectedProject.ticket_id) fetchHistory(selectedProject.ticket_id);
                                  }
                                }}
                                className={cn(
                                  "text-[10px] text-white font-bold bg-transparent border-none outline-none w-full",
                                  isSpecial && "text-yellow-500/80"
                                )}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                      <Clock className="w-16 h-16 mb-4" />
                      <p className="font-black uppercase tracking-[0.2em]">No History Records</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historyLogs.map((log, idx) => (
                        <div key={idx} className="p-6 bg-white/5 border border-white/5 rounded-2xl group flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{log.field_name}</span>
                              <span className="text-[10px] text-slate-500 font-bold">• {new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-400 font-medium line-through opacity-50">
                                {log.old_value}
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-700" />
                              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-bold">
                                {log.new_value}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                              {log.changed_by.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.changed_by.split('@')[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
