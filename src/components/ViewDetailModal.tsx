import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Star, Calendar, Clock, Activity, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import { NotionApiProject } from '../types';
import { cn } from '../lib/utils';

interface ViewDetailModalProps {
  project: NotionApiProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewDetailModal({ project, isOpen, onClose }: ViewDetailModalProps) {
  if (!isOpen || !project) return null;

  const raw = project.raw_data || {};

  const Section = ({ title, icon: Icon, children, className }: any) => (
    <div className={cn("bg-black/20 rounded-2xl border border-white/5 p-6 mb-4", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );

  const Stat = ({ label, value, colorClass = "text-white" }: any) => (
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</span>
      <span className={cn("text-[13px] font-bold break-words whitespace-pre-wrap leading-relaxed", colorClass)}>
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </span>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
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
          className="relative w-full max-w-6xl max-h-[90vh] bg-[#1a1f30] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                  {project.project_name}
                </h2>
                <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-0.5">
                  ID: {project.ticket_id || 'NOT_SIGNED'} • SOURCE: NOTION API
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            
            {/* Quick Actions / Status Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-indigo-500">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</span>
                <span className="text-xs font-bold text-white uppercase">{project.last_status}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-emerald-500">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">PIC</span>
                <span className="text-xs font-bold text-white uppercase">{project.pic_name}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-amber-500">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Category</span>
                <span className="text-xs font-bold text-white uppercase">{project.project_type}</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 border-l-4 border-l-rose-500">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Division</span>
                <span className="text-xs font-bold text-white uppercase">{project.owner_div || 'GENERAL'}</span>
              </div>
            </div>

            {/* Sections */}
            <Section title="Main Information" icon={Info}>
              <Stat label="Owner Name" value={project.owner_name} />
              <Stat label="Ticket ID" value={project.ticket_id} />
              <Stat label="Project Name" value={project.project_name} />
              <Stat label="Last Update Log" value={project.last_update_log} />
            </Section>

            <Section title="Feedback Scores" icon={Star}>
              <Stat label="Nilai Kebutuhan" value={raw['Nilai Kebutuhan']} />
              <Stat label="Konflik" value={raw['Konflik']} />
              <Stat label="Komunikasi" value={raw['Komunikasi']} />
              <Stat label="Waktu" value={raw['Waktu']} />
              <Stat label="Kolaborasi" value={raw['Kolaborasi']} />
              <Stat label="Teknis" value={raw['Teknis']} />
              <Stat label="Rata-rata" value={raw['Rata-rata']} colorClass="text-indigo-400 font-black" />
            </Section>

            <Section title="Milestone Feedback" icon={Activity}>
              <Stat label="Diskusi FPS" value={raw['Diskusi FPS']} />
              <Stat label="Review FSD" value={raw['Review FSD']} />
              <Stat label="Dev Fixing" value={raw['Dev Fixing']} />
              <Stat label="SIT" value={raw['SIT']} />
              <Stat label="UAT CR" value={raw['UAT CR']} />
            </Section>

            <Section title="Live & Monitoring" icon={CheckCircle2}>
              <Stat label="Compiler MG" value={raw['Compiler MG']} />
              <Stat label="Realized Finish" value={raw['Realized Finish']} />
              <Stat label="Live Plan" value={raw['Live Plan']} />
              <Stat label="Late Days" value={raw['Late Days']} colorClass={raw['Late Days'] > 0 ? "text-rose-400" : "text-emerald-400"} />
              <Stat label="Status Live" value={raw['Status Live']} />
              <Stat label="Monitoring Review" value={raw['Monitoring Review']} />
            </Section>

            <Section title="Temporal Analysis" icon={Clock}>
              <Stat label="Total Effective Days" value={raw['Total Effective Days']} />
              <Stat label="FPS Approved" value={raw['FPS Approved']} />
              <Stat label="Selisih Waktu FSD" value={raw['Selisih Waktu FSD']} />
              <Stat label="Hold Sequential" value={raw['Hold Sequential']} />
              <Stat label="Recall History" value={raw['Recall History']} />
            </Section>

            <Section title="Raw Sync Data" icon={Activity} className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
               <div className="col-span-full">
                 <pre className="text-[10px] font-mono bg-black/40 p-4 rounded-xl overflow-x-auto max-h-60 custom-scrollbar text-slate-500">
                   {JSON.stringify(raw, null, 2)}
                 </pre>
               </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">
              * This is read-only data synchronized directly from Notion API
            </span>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
            >
              Close Record
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
