import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PortfolioPage } from "#/pages/PortfolioPage";
import { PostDetailPage } from "#/pages/PostDetailPage";
import { PostsPage } from "#/pages/PostsPage";

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <PortfolioPage /> },
      { path: "/posts", element: <PostsPage /> },
      { path: "/posts/:slug", element: <PostDetailPage /> },
    ],
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
