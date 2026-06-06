"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, FileText, Briefcase, Settings, Menu, Plus } from "lucide-react";
import clsx from "clsx";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "h-screen flex flex-col border-r border-zinc-900 bg-[#09090b] transition-all duration-300 z-50",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide text-zinc-100">AI Persona</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx("p-2 rounded-md hover:bg-zinc-900 text-zinc-400 transition-colors", collapsed && "mx-auto")}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="flex-1 px-3 py-4 flex flex-col gap-2 overflow-y-auto">
        <Link
          href="/"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900",
            collapsed && "justify-center"
          )}
        >
          <Plus size={18} />
          {!collapsed && <span>New Thread</span>}
        </Link>

        {!collapsed && <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mt-6 mb-2 px-3">Recent</div>}
        
        <button
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 w-full text-left",
            collapsed && "justify-center"
          )}
        >
          <MessageSquare size={16} />
          {!collapsed && <span className="truncate">Conversation History</span>}
        </button>

        {!collapsed && <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mt-6 mb-2 px-3">Resources</div>}
        
        <a
          href="https://github.com/Deepanshu-Nst"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50",
            collapsed && "justify-center"
          )}
        >
          <Briefcase size={16} />
          {!collapsed && <span>Projects</span>}
        </a>
        <button
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 w-full text-left",
            collapsed && "justify-center"
          )}
        >
          <FileText size={16} />
          {!collapsed && <span>Resume</span>}
        </button>
      </div>

      <div className="p-3 border-t border-zinc-900">
        <button
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 w-full text-left",
            collapsed && "justify-center"
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
