import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/lilita-one/latin-400.css";
import "@fontsource/zcool-kuaile/chinese-simplified-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-800.css";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
