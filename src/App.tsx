import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useContractorStore } from "./hooks/useContractorStore";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const EstimatorPage = lazy(() => import("./pages/EstimatorPage").then((module) => ({ default: module.EstimatorPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function App() {
  const { contractors, contractorMap, isReady, error, refresh } = useContractorStore();

  if (!isReady) {
    return (
      <main className="page-shell loading-shell">
        <div className="empty-state">
          <h1>Loading estimator scaffold</h1>
          <p>Preparing contractor records and public pages.</p>
        </div>
      </main>
    );
  }

  if (error && contractors.length === 0) {
    return (
      <main className="page-shell loading-shell">
        <div className="empty-state">
          <h1>Unable to load contractors</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void refresh()}>
            Retry loading
          </button>
        </div>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="page-shell loading-shell">
          <div className="empty-state">
            <h1>Loading page</h1>
            <p>Preparing the next screen.</p>
          </div>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage contractors={contractors} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={contractors[0] ? <Navigate to={`/admin/${contractors[0].slug}`} replace /> : <NotFoundPage />}
        />
        <Route path="/admin/:slug" element={<AdminPage refreshPublicContractors={refresh} />} />
        <Route path="/:slug" element={<EstimatorPage contractorMap={contractorMap} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
