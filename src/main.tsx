// 4culori CRM & ERP - Entry Point
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[APP INIT] Starting React application mount');

const rootElement = document.getElementById("root");

if (rootElement) {
  rootElement.innerHTML = '';
  
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[APP INIT] React root rendered');
}
