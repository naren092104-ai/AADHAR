import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "@/router";
import "@/styles.css";

const router = getRouter();

// Mount on document.body so RootShell's <html>/<head>/<body> tags
// don't end up nested inside a <div>, which causes the React hydration
// warning "In HTML, <html> cannot be a child of <div>".
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
