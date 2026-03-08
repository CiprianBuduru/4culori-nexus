// 4culori CRM & ERP - Entry Point
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";



const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  const msg = 'Missing Supabase environment variables';
  console.error('[APP FATAL]', msg);
  document.getElementById('root')!.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ef4444;padding:2rem;text-align:center"><h2>Application failed to start</h2><p>${msg}</p></div>`;
  throw new Error(msg);
}

const rootElement = document.getElementById("root");

if (rootElement) {
  
  rootElement.innerHTML = '';

  try {
    
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('[APP FATAL]', error);
    rootElement.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#ef4444;padding:2rem;text-align:center"><h2>Application failed to start</h2><p>${error instanceof Error ? error.message : 'Unknown error'}</p></div>`;
  }
}
