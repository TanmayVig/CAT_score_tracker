import { useCallback, useState } from "react";
import { AppHeader, type ActivePage } from "./components/PageScaffold";
import { MocksPage } from "./pages/MocksPage";
import { SmallTestsPage } from "./pages/SmallTestsPage";

type PageHandle = {
  refresh: () => Promise<void>;
  loading: boolean;
};

const idleHandle: PageHandle = {
  refresh: async () => {},
  loading: false,
};

function App() {
  const [activePage, setActivePage] = useState<ActivePage>("mocks");
  const [pageHandles, setPageHandles] = useState<Record<ActivePage, PageHandle>>({
    mocks: idleHandle,
    "small-tests": idleHandle,
  });

  const updatePageHandle = useCallback(
    (page: ActivePage, handle: PageHandle) => {
      setPageHandles((current) => ({ ...current, [page]: handle }));
    },
    [],
  );
  const updateMocksHandle = useCallback(
    (handle: PageHandle) => updatePageHandle("mocks", handle),
    [updatePageHandle],
  );
  const updateSmallTestsHandle = useCallback(
    (handle: PageHandle) => updatePageHandle("small-tests", handle),
    [updatePageHandle],
  );

  return (
    <main className="app-shell">
      <AppHeader
        activePage={activePage}
        loading={pageHandles[activePage].loading}
        onRefresh={() => void pageHandles[activePage].refresh()}
        onPageChange={setActivePage}
      />

      {activePage === "mocks" ? (
        <MocksPage onStatusChange={updateMocksHandle} />
      ) : (
        <SmallTestsPage onStatusChange={updateSmallTestsHandle} />
      )}
    </main>
  );
}

export default App;
