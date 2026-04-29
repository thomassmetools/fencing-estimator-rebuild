import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useContractorStore } from "./hooks/useContractorStore";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const AdminHomePage = lazy(() => import("./pages/AdminHomePage").then((module) => ({ default: module.AdminHomePage })));
const CheckoutSuccessPage = lazy(() =>
  import("./pages/CheckoutSuccessPage").then((module) => ({ default: module.CheckoutSuccessPage })),
);
const WelcomePage = lazy(() => import("./pages/WelcomePage").then((module) => ({ default: module.WelcomePage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage })));
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })),
);
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
        <Route path="/portal" element={<Navigate to="/admin" replace />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/:slug" element={<AdminPage refreshPublicContractors={refresh} />} />
        <Route path="/:slug" element={<EstimatorPage contractorMap={contractorMap} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
