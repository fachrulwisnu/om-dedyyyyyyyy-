import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { MigrateNotion } from '../types';
import { 
  Upload, 
  Database, 
  LayoutGrid, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Trash2, 
  Loader2, 
  Filter,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  XCircle,
  MoreHorizontal,
  Search,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MIGRATION_STATUSES, STATUS_COLORS } from '../constants/migration';

export function NotionMigrationBoard() {
  const [data, setData] = useState<MigrateNotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedProject, setSelectedProject] = useState<MigrateNotion | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
  const [initialPic, setInitialPic] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [picFilter, setPicFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const CACHE_KEY = 'om_dedy_notion_migration_cache';

  const fetchMigrateData = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      }
    }
    try {
      const { data: migrateData, error } = await supabase
        .from('migrate_notion')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(migrateData || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify(migrateData || []));
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
    fetchMigrateData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setEditedNotes(selectedProject.last_update_log || '');
      setActiveTab('DETAILS');
      if (selectedProject.ticket_id) fetchHistory(selectedProject.ticket_id);
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
      
      setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, last_update_log: editedNotes } : p));
      setSelectedProject(prev => prev ? { ...prev, last_update_log: editedNotes } : null);
      if (selectedProject.ticket_id) fetchHistory(selectedProject.ticket_id);
      alert('Notes updated successfully!');
    } catch (err) {
      console.error('Update Error:', err);
      alert('Failed to update notes.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAndImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      // 1. Delete existing data (Standard idiom for "delete all")
      const { error: deleteError } = await supabase
        .from('migrate_notion')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      // 2. Parse and Insert
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data: rows } = results;
          
          // 1. Map raw data
          const mappedData = rows.map((row: any) => {
            const rawStatus = row['Last Status'] ? row['Last Status'].trim() : '';
            
            return {
              ticket_id: row['Ticket'] || null,
              project_name: row['Name'] || row['Project Name'] || '',
              last_status: rawStatus,
              pic_name: row['PIC Name'] || 'Unassigned',
              owner_div: row['Owner Div'] || null,
              owner_name: row['Owner Name'] || null,
              project_type: row['Type Project'] || 'Uncategorized',
              last_update_log: row['Last Update'] || row['(Dev) Progress Updated'] || row['(SIT) Progress Updated'] || null,
              raw_data: row
            };
          });

          // 2. Filter out ghost rows and excluded statuses
          const cleanData = mappedData.filter(row => {
            // A. Remove Ghost Rows
            if (!row.project_name || row.project_name.trim() === '') {
              return false;
            }

            // B. Exclude "Live", "Monitoring", "Done"
            const statusLower = row.last_status.toLowerCase();
            if (
              statusLower.includes('live') || 
              statusLower.includes('monitoring') || 
              statusLower.includes('done') ||
              statusLower === 'live on monitoring'
            ) {
              return false;
            }

            return true;
          });

          // 3. Normalize Fallback and Match Constants
          const finalDataToInsert = cleanData.map(row => {
            const raw = row.last_status === '' ? 'On Queue' : row.last_status;
            // Match with MIGRATION_STATUSES if possible for exact casing
            const sanitized = MIGRATION_STATUSES.find(
              s => s.toLowerCase() === raw.toLowerCase()
            ) || raw;

            return {
              ...row,
              last_status: sanitized
            };
          });

          if (finalDataToInsert.length === 0) {
            alert('No valid projects found to import (or all were Live/Monitoring).');
            setIsImporting(false);
            return;
          }

          // 4. Batch insert 
          const { error: insertError } = await supabase.from('migrate_notion').insert(finalDataToInsert);
          
          if (insertError) {
            console.error('Insert Error:', insertError);
            alert('Failed to import data!');
          } else {
            alert(`Successfully imported ${finalDataToInsert.length} projects!`);
            localStorage.removeItem('om_dedy_notion_data'); // Cleanup cache
            fetchMigrateData();
          }
          
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    } catch (err) {
      console.error('Import Error:', err);
      alert('An error occurred during re-import.');
      setIsImporting(false);
    }
  };

  // Memoized Data Processing
  const { picCounts, statusCounts, groupedData } = useMemo(() => {
    // 1. Calculate Summary (always based on full data fetched)
    const picAcc: Record<string, number> = {};
    const statusAcc: Record<string, number> = {};
    
    // Initialize statusAcc with all statuses
    MIGRATION_STATUSES.forEach(status => {
      statusAcc[status] = 0;
    });

    data.forEach(item => {
      // PIC
      const pic = item.pic_name || 'Unassigned';
      picAcc[pic] = (picAcc[pic] || 0) + 1;

      // Status for Summary Cards - exact match
      const status = item.last_status || 'On Queue';
      if (statusAcc.hasOwnProperty(status)) {
        statusAcc[status]++;
      }
    });

    // 2. Filter Content
    let result = data;
    
    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter(item => item.last_status === statusFilter);
    }

    if (picFilter) {
      result = result.filter(item => (item.pic_name || 'Unassigned') === picFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.project_name.toLowerCase().includes(q) || 
        (item.ticket_id || '').toLowerCase().includes(q) ||
        (item.pic_name || '').toLowerCase().includes(q)
      );
    }

    // 3. Grouping
    const groups: Record<string, MigrateNotion[]> = {};
    result.forEach(item => {
      const type = item.project_type || 'Uncategorized';
      if (!groups[type]) groups[type] = [];
      groups[type].push(item);
    });

    return { 
      picCounts: picAcc, 
      statusCounts: statusAcc,
      groupedData: groups 
    };
  }, [data, statusFilter, picFilter, searchQuery]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <div className="p-6 bg-[#0a0f1d] min-h-screen text-slate-300">
      {/* Loading Overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1a1f30] p-10 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center max-w-sm">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Processing Notion Data</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Clearing existing records and inserting new transactions. Please do not close this tab.
            </p>
            <div className="w-full bg-white/5 h-1 rounded-full mt-8 overflow-hidden">
              <div className="bg-indigo-500 h-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-500" />
            Om Dedy <span className="text-indigo-500">Notion Migrate</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Migration Sandbox • Production Exclusion Logic Active</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => fetchMigrateData(true)}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            title="Force Refresh Data"
          >
            <Loader2 className={cn("w-4 h-4 text-indigo-400", loading ? "animate-spin" : "")} />
          </button>

          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="SEARCH PROJECTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500/50 transition-all w-48 md:w-64"
            />
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            disabled={isImporting}
          >
            <Database className="w-4 h-4" />
            Clear & Re-import Data
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleClearAndImport} 
            />
          </button>
        </div>
      </div>

      {/* Summary Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <button 
          onClick={() => setStatusFilter(null)}
          className={cn(
             "p-3 rounded-xl border text-left transition flex flex-col justify-between h-24 relative overflow-hidden group",
            !statusFilter ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/20" : "bg-[#1a1f30] border-gray-700 hover:border-gray-500"
          )}
        >
          <div className={cn("text-[10px] font-black uppercase tracking-widest", !statusFilter ? "text-white/60" : "text-slate-500")}>ALL PROJECTS</div>
          <div className="text-2xl font-black text-white">{data.length}</div>
          {!statusFilter && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>

        {MIGRATION_STATUSES.map((status) => {
          const count = statusCounts[status] || 0;
          const isActive = statusFilter === status;
          return (
            <button 
              key={status}
              onClick={() => setStatusFilter(isActive ? null : status)}
              className={cn(
                "p-3 rounded-xl border text-left transition flex flex-col justify-between h-24 relative group",
                isActive ? "bg-indigo-600/40 border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-600/40" : "bg-[#1a1f30] border-gray-700 hover:border-gray-500"
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

      {/* PIC Filter Dropdown - Redesigned to 5-column grid */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3 h-3 text-indigo-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter PIC Name:</span>
          {picFilter && (
            <button onClick={() => setPicFilter(null)} className="text-[10px] text-indigo-400 font-bold hover:underline ml-2 uppercase tracking-widest">Reset PIC Filter</button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(picCounts).sort((a,b) => b[1] - a[1]).map(([pic, count]) => (
            <button 
              key={pic}
              onClick={() => setPicFilter(picFilter === pic ? null : pic)}
              className={cn(
                "flex justify-between items-center bg-[#1a1f30] rounded-xl border transition-all h-10 overflow-hidden group",
                picFilter === pic ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-600/20" : "border-white/5 hover:border-indigo-500/50"
              )}
            >
              <span className={cn(
                "px-3 font-black text-[10px] uppercase truncate tracking-widest",
                picFilter === pic ? "text-white" : "text-yellow-500/80 group-hover:text-yellow-400"
              )} title={pic}>
                {pic}
              </span>
              <span className={cn(
                "px-3 h-full flex items-center bg-white/5 text-[10px] font-black",
                picFilter === pic ? "bg-indigo-600/40 text-white" : "text-slate-500"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-3xl">
          <Database className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matching projects found</p>
          {(statusFilter || picFilter || searchQuery) && (
             <button onClick={() => { setStatusFilter(null); setPicFilter(null); setSearchQuery(''); }} className="mt-4 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:underline">Clear all filters</button>
          )}
        </div>
      ) : (
        <div className="space-y-8 pb-32">
          {Object.entries(groupedData).sort().map(([type, items]) => (
            <div key={type} className="space-y-4">
              <button 
                onClick={() => toggleGroup(type)}
                className="flex items-center gap-3 w-full text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/20 transition-colors">
                  {expandedGroups[type] !== false ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">{type}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black text-slate-500">
                    {items.length} PROJECTS
                  </span>
                </div>
                <div className="h-px grow bg-gradient-to-r from-white/10 to-transparent ml-4" />
              </button>

              {expandedGroups[type] !== false && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((project) => (
                    <div 
                      key={project.id} 
                      onClick={() => setSelectedProject(project)}
                      className={cn(
                        "bg-[#1a1f30] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 flex flex-col gap-3 transition-all group relative cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-white font-bold text-sm leading-tight group-hover:text-indigo-400 transition-colors line-clamp-2 pr-4">{project.project_name}</h3>
                        <div className="self-start px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-mono text-slate-500 shrink-0">
                          {project.ticket_id || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded-md border font-black uppercase tracking-widest",
                          STATUS_COLORS[project.last_status] || "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                          {project.last_status}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[9px] font-black border border-indigo-500/20">
                            {project.pic_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{project.pic_name}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-4 border-t border-white/5">
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed whitespace-pre-wrap italic line-clamp-4 group-hover:line-clamp-none transition-all">
                          {project.last_update_log || 'No recent updates or comments...'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Property Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setSelectedProject(null)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0f1423] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <input 
                    value={selectedProject.ticket_id || ''}
                    onChange={async (e) => {
                       const newVal = e.target.value;
                       const { error } = await supabase.from('migrate_notion').update({ ticket_id: newVal }).eq('id', selectedProject.id);
                       if (!error) {
                         await logChange(newVal || selectedProject.id, 'Ticket ID', selectedProject.ticket_id, newVal);
                         setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ticket_id: newVal } : p));
                         setSelectedProject(prev => prev ? { ...prev, ticket_id: newVal } : null);
                       }
                    }}
                    placeholder="TICKET-ID"
                    className="px-3 py-1 bg-indigo-600 rounded text-[10px] font-black text-white uppercase outline-none w-32 placeholder:text-white/40"
                  />
                  <div className="relative group/status">
                    <select 
                      value={selectedProject.last_status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        const { error } = await supabase
                          .from('migrate_notion')
                          .update({ last_status: newStatus })
                          .eq('id', selectedProject.id);
                        if (!error) {
                          await logChange(selectedProject.ticket_id || selectedProject.id, 'Status', selectedProject.last_status, newStatus);
                          setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, last_status: newStatus } : p));
                          setSelectedProject(prev => prev ? { ...prev, last_status: newStatus } : null);
                        }
                      }}
                      className={cn(
                        "text-[10px] px-3 py-1 rounded-lg border font-black uppercase tracking-widest bg-transparent cursor-pointer focus:outline-none appearance-none pr-8 outline-none",
                        STATUS_COLORS[selectedProject.last_status] || "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}
                    >
                      {MIGRATION_STATUSES.map(s => (
                        <option key={s} value={s} className="bg-[#1a1f30] text-white uppercase tracking-widest font-black">{s}</option>
                      ))}
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
                      setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_name: newVal } : p));
                      setSelectedProject(prev => prev ? { ...prev, project_name: newVal } : null);
                    }
                  }}
                  onBlur={() => logChange(selectedProject.ticket_id || selectedProject.id, 'Project Name', '', selectedProject.project_name)}
                  className="text-3xl font-black text-white leading-tight bg-transparent border-none outline-none w-full hover:bg-white/5 rounded px-1 transition-colors"
                />
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-3 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded-2xl transition-all"
              >
                <XCircle className="w-6 h-6" />
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeTab === 'DETAILS' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Primary Fields */}
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Primary Assignment</h3>
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
                                  setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, pic_name: newVal } : p));
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
                                list="pic-suggestions-migrate"
                                className="bg-transparent border-none outline-none font-bold text-white w-full text-lg"
                                placeholder="Assign PIC..."
                              />
                              <datalist id="pic-suggestions-migrate">
                                {Object.keys(picCounts).map(pic => (
                                  <option key={pic} value={pic} />
                                ))}
                              </datalist>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/pic:opacity-100 transition-opacity">
                                <Search className="w-3 h-3 text-indigo-400/50" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Owner Division</label>
                            <input 
                               value={selectedProject.owner_div || ''}
                               onChange={async (e) => {
                                 const newVal = e.target.value;
                                 const { error } = await supabase.from('migrate_notion').update({ owner_div: newVal }).eq('id', selectedProject.id);
                                 if (!error) {
                                   setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, owner_div: newVal } : p));
                                   setSelectedProject(prev => prev ? { ...prev, owner_div: newVal } : null);
                                 }
                               }}
                               className="bg-transparent border-none outline-none font-bold text-white w-full uppercase"
                               placeholder="DIVISI..."
                            />
                            <input 
                               value={selectedProject.owner_name || ''}
                               onChange={async (e) => {
                                  const newVal = e.target.value;
                                  const { error } = await supabase.from('migrate_notion').update({ owner_name: newVal }).eq('id', selectedProject.id);
                                  if (!error) {
                                    setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, owner_name: newVal } : p));
                                    setSelectedProject(prev => prev ? { ...prev, owner_name: newVal } : null);
                                  }
                               }}
                               className="text-sm text-slate-500 font-medium bg-transparent border-none outline-none w-full"
                               placeholder="Nama Owner/User..."
                            />
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Project Category</label>
                            <input 
                                value={selectedProject.project_type || ''}
                                onChange={async (e) => {
                                  const newVal = e.target.value;
                                  const { error } = await supabase.from('migrate_notion').update({ project_type: newVal }).eq('id', selectedProject.id);
                                  if (!error) {
                                    setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_type: newVal } : p));
                                    setSelectedProject(prev => prev ? { ...prev, project_type: newVal } : null);
                                  }
                                }}
                                className="bg-transparent border-none outline-none font-bold text-white w-full uppercase"
                                placeholder="CATEGORY..."
                             />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Editable Notes Section */}
                    <section>
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Notes & Logs</h3>
                         {isUpdating && <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />}
                      </div>
                      <div className="relative group">
                        <textarea 
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="Add additional comments or logs here..."
                          className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 text-xs text-slate-300 font-medium leading-[1.8] focus:border-indigo-500/50 outline-none resize-none transition-all ring-offset-black focus:ring-4 ring-indigo-500/10 placeholder:text-slate-700"
                        />
                        <button 
                          onClick={handleUpdateNotes}
                          disabled={isUpdating || editedNotes === selectedProject.last_update_log}
                          className="absolute bottom-4 right-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-[10px] font-black uppercase text-white rounded-xl transition-all shadow-2xl shadow-indigo-600/40"
                        >
                          {isUpdating ? 'SAVING...' : 'COMMIT CHANGES'}
                        </button>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Dynamic Properties */}
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
                                    setData(prev => prev.map(p => p.id === selectedProject.id ? { ...p, raw_data: newRaw } : p));
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
