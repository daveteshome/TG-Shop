import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";


import { MemoryRouter } from "react-router-dom";

// Configure Telegram WebApp to disable swipe-to-close
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  const tg = (window as any).Telegram.WebApp;
  tg.ready();
  tg.expand();
  // Disable vertical swipes to prevent accidental closing
  tg.disableVerticalSwipes();
}

const el = document.getElementById("root");
if (!el) throw new Error("#root missing");

// Always use MemoryRouter inside TG Mini App
createRoot(el).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>
  </React.StrictMode>
);
