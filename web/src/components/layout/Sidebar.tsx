import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import Logo from "./Logo";
import {
  LayoutDashboard, FileText, Send, FileStack, CheckCircle2,
  Settings, LogOut, ChevronRight, Building2, PanelLeftClose
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Documents", icon: FileText, href: "/documents" },
  { label: "Sent", icon: Send, href: "/sent" },
  { label: "Drafts", icon: FileStack, href: "/drafts" },
  { label: "Completed", icon: CheckCircle2, href: "/completed" },
];

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (href: string) =>
    href === "/dashboard"
      ? location.pathname === href
      : location.pathname.startsWith(href);

  return (
    <aside className="flex flex-col h-full bg-white border-r border-surface-300 w-60">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-200">
        <Link to="/dashboard">
          <Logo variant="sidebar" />
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-100 text-surface-500"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="mb-1">
          <Link
            to="/documents/new"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-sm"
            onClick={onClose}
          >
            <span className="text-base leading-none">+</span>
            New Document
          </Link>
        </div>

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10.5px] font-semibold text-surface-500 uppercase tracking-wider mb-1">
            Documents
          </p>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={onClose}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-200 p-3 space-y-1">
        <Link
          to="/settings"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-100 hover:text-surface-900 transition-colors",
            location.pathname.startsWith("/settings") && "bg-surface-100 text-surface-900"
          )}
        >
          <Settings size={16} className="text-surface-500 flex-shrink-0" />
          Settings
        </Link>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {(user?.name || "SIVARAM R S").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-900 truncate">{user?.name || "SIVARAM R S"}</p>
            <p className="text-xs text-surface-500 truncate">{user?.email || "ramsiva97465@gmail.com"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Org */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <Building2 size={13} className="text-surface-400 flex-shrink-0" />
          <span className="text-xs text-surface-500 truncate">{user?.organizationName || "Snapserve Vault"}</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { label: string; icon: React.FC<any>; href: string };
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-brand-50 text-brand-700 font-semibold"
          : "text-surface-700 hover:bg-surface-100 hover:text-surface-900"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "flex-shrink-0 transition-colors",
          active ? "text-brand-600" : "text-surface-500"
        )}
      />
      {item.label}
      {active && <ChevronRight size={14} className="ml-auto text-brand-400" />}
    </Link>
  );
}
