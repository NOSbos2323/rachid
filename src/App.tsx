import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
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
        </div>
      </Suspense>
    </LanguageProvider>
  );
}

export default App;