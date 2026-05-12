import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Info, 
  ShieldCheck, 
  User, 
  Calendar, 
  Activity, 
  FileText,
  AlertCircle,
  RefreshCw,
  History,
  ArrowRight
} from 'lucide-react';
import { Project, ProjectStatus, AuditLog, HistoryEditProject } from '../types';
import { cn } from '../lib/utils';
import { CustomDatePicker } from './ui/CustomDatePicker';
import { taskService } from '../services/taskService';
import { format } from 'date-fns';

interface ProjectDetailProps {
  project: Project | null;
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Project>) => Promise<void>;
  isMobile?: boolean;
}

const STATUS_OPTIONS = Object.values(ProjectStatus);

export default function ProjectDetail({ project, isOpen, user, onClose, onUpdate, isMobile }: ProjectDetailProps) {
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'DETAILS' | 'SYSTEM_LOG' | 'HISTORY_EDIT'>('DETAILS');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [historyEditLogs, setHistoryEditLogs] = useState<HistoryEditProject[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const isOwner = user?.name?.toLowerCase() === project?.pic_name?.toLowerCase();
  const isAdmin = user?.access_level?.toLowerCase() === 'admin' || user?.access_level?.toLowerCase() === 'superadmin';
  const hasEditControl = isOwner || isAdmin;

  useEffect(() => {
    if (project && isOpen) {
      setEditedProject({ ...project });
      fetchAuditLogs();
    }
  }, [project, isOpen]);

  const fetchAuditLogs = async () => {
    if (!project) return;
    setLoadingLogs(true);
    try {
      const [logs, hLogs] = await Promise.all([
        taskService.getAuditLogs({ projectId: project.id }),
        taskService.getHistoryEditProjects(project.id)
      ]);
      setAuditLogs(logs);
      setHistoryEditLogs(hLogs);
    } catch (err) {
      console.error("Failed to fetch project audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen || !project) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(project.id, editedProject);
      onClose();
    } catch (err) {
      console.error("Failed to update project details:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Project, value: any) => {
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 block">
      {children}
    </label>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            "relative w-full bg-slate-50 dark:bg-[#0f111a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col",
            isMobile ? "h-[90vh]" : "max-w-3xl max-h-[85vh]"
          )}
        >
          {/* Header */}
          <div className="px-8 pt-6 pb-2 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-black/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight">
                    Project Control
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Management Panel • {project.ticket_id || 'NO_TICKET'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Segment Switcher - Pill Shaped */}
            <div className="flex items-center bg-[#0F111A] rounded-full p-1 border border-slate-800 w-fit mb-4">
              <button
                onClick={() => setActiveSegment('DETAILS')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                  activeSegment === 'DETAILS' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                INFRASTRUCTURE BREAKDOWN
              </button>
              <button
                onClick={() => setActiveSegment('SYSTEM_LOG')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                  activeSegment === 'SYSTEM_LOG' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                SYSTEM LOG
              </button>
              <button
                onClick={() => setActiveSegment('HISTORY_EDIT')}
                className={cn(
                  "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                  activeSegment === 'HISTORY_EDIT' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                HISTORY EDIT
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-[#0f111a]">
            {activeSegment === 'DETAILS' ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-6">
                  <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                    <FieldLabel>Project Name</FieldLabel>
                    <textarea
                      rows={2}
                      value={editedProject.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                      placeholder="Enter project title..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>Division / Department</FieldLabel>
                      <input
                        type="text"
                        value={editedProject.div_owner || ''}
                        onChange={(e) => handleChange('div_owner', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        placeholder="e.g. IT Digital"
                      />
                    </div>
                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>Project Owner</FieldLabel>
                      <input
                        type="text"
                        value={editedProject.owner_name || ''}
                        onChange={(e) => handleChange('owner_name', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        placeholder="Full name of owner"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                       <FileText className="w-3.5 h-3.5 text-indigo-400" />
                       <FieldLabel>Project Diajukan (Detail Pengajuan)</FieldLabel>
                    </div>
                    <textarea
                      rows={4}
                      value={editedProject.project_diajukan || ''}
                      onChange={(e) => handleChange('project_diajukan', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                      placeholder="Describe the project background and requirements..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>Lead PIC Name</FieldLabel>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={editedProject.pic_name || ''}
                          onChange={(e) => handleChange('pic_name', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="Enter PIC name..."
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>Project Status</FieldLabel>
                      <div className="relative">
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 px-0.5" />
                        <select
                          value={editedProject.status || ''}
                          onChange={(e) => handleChange('status', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none cursor-pointer"
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>Start Date</FieldLabel>
                      <CustomDatePicker
                        selectedDate={editedProject.start_date || ''}
                        onChange={(val) => handleChange('start_date', val)}
                      />
                    </div>

                    <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                      <FieldLabel>End Date</FieldLabel>
                      <CustomDatePicker
                        selectedDate={editedProject.end_date || ''}
                        onChange={(val) => handleChange('end_date', val)}
                      />
                    </div>
                  </div>
                </div>

                {/* Warning Section */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-500/60 font-medium leading-relaxed italic">
                    Updating core project fields will trigger system-wide synchronization. Audit logs will record these changes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Retrieving Audit Records...</span>
                    </div>
                  ) : (() => {
                    const systemLogs = auditLogs.filter(log => {
                      const actor = (log.actor || "").toLowerCase();
                      const logType = (log.log_type || "");
                      const action = (log.action || "").toLowerCase();
                      const newPayloadStr = typeof log.new_payload === 'string' ? log.new_payload : JSON.stringify(log.new_payload || {});
                      
                      return actor.includes('system') || 
                             logType.includes('SYSTEM') || 
                             action.includes('auto') ||
                             newPayloadStr.toLowerCase().includes('"changed_by":"system');
                    });

                    if (activeSegment === 'HISTORY_EDIT') {
                      return (
                        <div className="overflow-x-auto bg-white dark:bg-[#0F111A] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                          <table className="w-full text-left text-[10px] text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-[#16192B] text-slate-500 uppercase font-black tracking-widest">
                              <tr>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-white/5">PIC Name</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-white/5">Date</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-white/5">Field Name</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-white/5">Before</th>
                                <th className="px-6 py-4 border-b border-slate-200 dark:border-white/5">After</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                              {historyEditLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic">
                                    Belum ada riwayat edit dari PIC.
                                  </td>
                                </tr>
                              ) : (
                                historyEditLogs.map((log) => {
                                  return (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4">
                                        <span className="font-black text-indigo-500 whitespace-nowrap">{log.pic_name || "Unknown PIC"}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="text-slate-400 whitespace-nowrap font-mono">{log.created_at ? format(new Date(log.created_at), 'dd/MM/yy') : '-'}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{log.field_name}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="max-w-[120px] truncate text-rose-500 line-through opacity-50 italic">
                                          {log.before_value || "-"}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="max-w-[120px] truncate text-emerald-500 font-black italic">
                                          {log.after_value || "-"}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    if (systemLogs.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <History className="w-12 h-12 text-slate-700/30 mb-4" />
                          <p className="text-slate-500 text-sm italic py-4">Belum ada riwayat aktivitas sistem.</p>
                        </div>
                      );
                    }

                    return systemLogs.map((log, i) => (
                      <div key={log.id || i} className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                           <div>
                             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{log.actor || 'System'}</span>
                             <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">{log.action}</p>
                           </div>
                           <span className="text-[9px] font-mono text-slate-500">{log.created_at ? format(new Date(log.created_at), 'dd/MM/yy HH:mm') : 'N/A'}</span>
                        </div>
                        
                        {log.old_payload && log.new_payload && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                             {Object.keys(log.new_payload).map(key => {
                               if (['id', 'created_at', 'updated_at'].includes(key)) return null;
                               if (JSON.stringify(log.old_payload[key]) === JSON.stringify(log.new_payload[key])) return null;
                               return (
                                 <div key={key} className="flex flex-col gap-1">
                                   <span className="text-[9px] font-mono text-indigo-400 capitalize opacity-70">{key.replace(/_/g, ' ')}</span>
                                   <div className="flex items-center gap-2">
                                     <span className="text-[8px] text-rose-500 line-through opacity-40 truncate max-w-[200px]">{String(log.old_payload[key] || 'n/a')}</span>
                                     <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                                     <span className="text-[9px] text-emerald-500 font-bold italic truncate max-w-[200px]">{String(log.new_payload[key] || 'n/a')}</span>
                                   </div>
                                 </div>
                               );
                             })}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-black/40 flex items-center justify-between gap-4">
            <div className="flex-1">
              {!hasEditControl && (
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Editing PIC {project.pic_name}'s Territory</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                disabled={isSaving}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "px-8 py-3 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50",
                  hasEditControl 
                    ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20" 
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                )}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {hasEditControl ? <Save className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {hasEditControl ? 'Commit Changes' : 'Authorized Override'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
