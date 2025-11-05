import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";


import { MemoryRouter } from "react-router-dom";

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
