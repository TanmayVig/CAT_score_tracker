import type { ReactNode } from "react";
import { BarChart3, ClipboardList, Download, MessageSquare, RefreshCw } from "lucide-react";

export type ActivePage = "mocks" | "small-tests" | "chat";
export type PageHandle = {
  refresh: () => Promise<void>;
  loading: boolean;
  exportData?: () => void;
  exportDisabled?: boolean;
  exportLabel?: string;
};

type AppHeaderProps = {
  activePage: ActivePage;
  loading: boolean;
  exportDisabled?: boolean;
  exportLabel?: string;
  onRefresh: () => void;
  onExport?: () => void;
  onPageChange: (page: ActivePage) => void;
};

export function AppHeader({ activePage, loading, exportDisabled, exportLabel = "Export for LLM", onRefresh, onExport, onPageChange }: AppHeaderProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Local CAT prep dashboard</p>
          <h1>CAT Mock Tracker</h1>
        </div>
        <div className="topbar-actions">
          {onExport ? (
            <button className="ghost-button" type="button" onClick={onExport} disabled={exportDisabled}>
              <Download aria-hidden="true" size={18} />
              {exportLabel}
            </button>
          ) : null}
          <button className="ghost-button" type="button" onClick={onRefresh} disabled={loading}>
            <RefreshCw aria-hidden="true" size={18} />
            Refresh
          </button>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Tracker section">
        <button
          className={activePage === "mocks" ? "active" : ""}
          type="button"
          onClick={() => onPageChange("mocks")}
        >
          <BarChart3 aria-hidden="true" size={17} />
          Mocks
        </button>
        <button
          className={activePage === "small-tests" ? "active" : ""}
          type="button"
          onClick={() => onPageChange("small-tests")}
        >
          <ClipboardList aria-hidden="true" size={17} />
          Small Tests
        </button>
        <button
          className={activePage === "chat" ? "active" : ""}
          type="button"
          onClick={() => onPageChange("chat")}
        >
          <MessageSquare aria-hidden="true" size={17} />
          Chat
        </button>
      </nav>
    </>
  );
}

type PanelTitleProps = {
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
};

export function PanelTitle({ eyebrow, title, meta, icon }: PanelTitleProps) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {meta}
      </div>
      {icon}
    </div>
  );
}
