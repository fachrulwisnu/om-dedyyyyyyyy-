import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
  isDestructive?: boolean;
}

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText, 
  isDestructive 
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-[#0f1423] border border-gray-700 rounded-[1.5rem] max-w-sm w-full p-7 shadow-2xl overflow-hidden"
        >
          {/* Decorative Background Element */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl border ${isDestructive ? 'bg-red-500/10 border-red-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
              <AlertTriangle className={`w-5 h-5 ${isDestructive ? 'text-red-500' : 'text-indigo-400'}`} />
            </div>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{title}</h3>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-8">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button 
              onClick={onCancel} 
              className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-xl ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
