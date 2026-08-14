import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, Bell, Search, Plus } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/documents/new")) return "New Document";
    if (path.includes("/prepare")) return "Prepare Document";
    if (path.includes("/activity")) return "Document Activity";
    if (path.startsWith("/documents")) return "Documents";
    if (path === "/sent") return "Sent";
    if (path === "/drafts") return "Drafts";
    if (path === "/completed") return "Completed";
    if (path === "/templates") return "Templates";
    if (path === "/contacts") return "Contacts";
    if (path === "/team") return "Team";
    if (path === "/analytics") return "Analytics";
    if (path.startsWith("/settings")) return "Settings";
    return "Snapserve.ai";
  };

  return (
    <div className="flex h-screen bg-surface-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-10 shadow-xl animate-slide-in-right">
            <Sidebar
              isMobile
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-white border-b border-surface-300 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-100 text-surface-600"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-[15px] font-semibold text-surface-900">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-300 text-sm text-surface-500 hover:border-surface-400 hover:text-surface-700 transition-colors">
              <Search size={14} />
              <span>Search...</span>
              <span className="text-xs text-surface-400 ml-1">⌘K</span>
            </button>

            {/* Create (Mobile icon + Desktop full button) */}
            <Link
              to="/documents/new"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-950 hover:bg-surface-800 text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Create</span>
            </Link>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center cursor-pointer">
              <span className="text-white text-xs font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
