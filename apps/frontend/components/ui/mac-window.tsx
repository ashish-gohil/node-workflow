"use client";

export default function MacWindow({ children }) {
  return (
    <div
      className="relative border border-border-tech-light dark:border-border-tech-dark 
      bg-white/50 dark:bg-slate-900/50 backdrop-blur-md 
      p-1 shadow-2xl overflow-hidden rounded-xl"
    >
      {/* 🔝 Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 
        border-b border-border-tech-light dark:border-border-tech-dark 
        bg-slate-50 dark:bg-slate-800/50"
      >
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* 🍎 Mac Buttons */}
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-border-tech-light dark:bg-border-tech-dark mx-2" />

          {/* Title */}
          <span className="font-label text-[10px] uppercase tracking-widest text-slate-400">
            Project: Production_V4
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Avatars */}
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
            <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800" />
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-800 text-white">
              +2
            </div>
          </div>

          {/* Deploy Button */}
          <button className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-tighter rounded">
            Deploy
          </button>
        </div>
      </div>

      {/* 📦 Content Area */}
      <div className="relative h-[500px] bg-slate-50/50 dark:bg-black/20 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
