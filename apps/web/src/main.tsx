import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import { AppPage } from "./pages/app";
import { CalendarPage } from "./pages/calendar";
import { ContactDetailPane } from "./pages/contact-detail";
import { ContactEditPage } from "./pages/contact-edit";
import { ContactNewPage } from "./pages/contact-new";
import { ContactsPage } from "./pages/contacts";
import { LandingPage } from "./pages/landing";
import { LoginPage } from "./pages/login";
import { RemindersPage } from "./pages/reminders";
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
        <Route element={<LandingPage />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<SignupPage />} path="/signup" />
        <Route element={<AppPage />} path="/app" />
        <Route element={<RemindersPage />} path="/app/reminders" />
        <Route element={<CalendarPage />} path="/app/calendar" />
        <Route element={<ContactsPage />} path="/app/contacts">
          <Route element={<ContactDetailPane />} path=":id" />
        </Route>
        <Route element={<ContactNewPage />} path="/app/contacts/new" />
        <Route element={<ContactEditPage />} path="/app/contacts/:id/edit" />
        <Route element={<SettingsPage />} path="/app/settings" />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
