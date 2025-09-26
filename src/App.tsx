import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import routes from "tempo-routes";
import ActivationGate from "./pages/ActivationGate";
import { LanguageProvider } from "./lib/i18n";

function App() {
  return (
    <LanguageProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<ActivationGate />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </div>
      </Suspense>
    </LanguageProvider>
  );
}

export default App;