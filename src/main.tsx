// 4culori CRM & ERP - Entry Point
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: Log when main.tsx loads
console.log("Main.tsx loaded - attempting to render app");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
} else {
  console.log("Root element found, rendering App...");
  
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 400px; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-bottom: 12px;">Eroare la încărcare</h1>
          <p style="color: #666; margin-bottom: 16px;">A apărut o eroare la încărcarea aplicației.</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Reîncarcă pagina
          </button>
        </div>
      </div>
    `;
  }
}