import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PortfolioPage } from "#/pages/PortfolioPage";
import { PostDetailPage } from "#/pages/PostDetailPage";
import { PostsPage } from "#/pages/PostsPage";

const router = createBrowserRouter([
  { path: "/", element: <PortfolioPage /> },
  { path: "/posts", element: <PostsPage /> },
  { path: "/posts/:slug", element: <PostDetailPage /> },
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
