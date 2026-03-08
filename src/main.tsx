// 4culori CRM & ERP - Entry Point
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  const msg = 'Missing Supabase environment variables';
  document.getElementById('root')!.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ef4444;padding:2rem;text-align:center"><p>${msg}</p></div>`;
  throw new Error(msg);
}

const rootElement = document.getElementById("root");

if (rootElement) {
  rootElement.innerHTML = '';
  
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
}
