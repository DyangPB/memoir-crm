import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { App } from "./App";
import { AppPage } from "./pages/app";
import { ContactDetailPage } from "./pages/contact-detail";
import { ContactEditPage } from "./pages/contact-edit";
import { ContactNewPage } from "./pages/contact-new";
import { LoginPage } from "./pages/login";
import { SettingsPage } from "./pages/settings";
import { SignupPage } from "./pages/signup";
import "./index.css";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route element={<AppPage />} path="/app" />
        <Route element={<ContactNewPage />} path="/app/contacts/new" />
        <Route element={<ContactDetailPage />} path="/app/contacts/:id" />
        <Route element={<ContactEditPage />} path="/app/contacts/:id/edit" />
        <Route element={<SettingsPage />} path="/app/settings" />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
