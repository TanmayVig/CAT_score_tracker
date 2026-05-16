import type { ReactNode } from "react";
import { BarChart3, ClipboardList, RefreshCw } from "lucide-react";

export type ActivePage = "mocks" | "small-tests";

type AppHeaderProps = {
  activePage: ActivePage;
  loading: boolean;
  onRefresh: () => void;
  onPageChange: (page: ActivePage) => void;
};

export function AppHeader({ activePage, loading, onRefresh, onPageChange }: AppHeaderProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Local CAT prep dashboard</p>
          <h1>CAT Mock Tracker</h1>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </button>
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
