import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import AuthBootstrap from './components/AuthBootstrap';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthBootstrap />
      <App />
    </BrowserRouter>
  </StrictMode>
);