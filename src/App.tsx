import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Outlet, RouterProvider, ScrollRestoration, createBrowserRouter } from "react-router-dom";
import { PortfolioPage } from "#/pages/PortfolioPage";

const PostsPage = lazy(() =>
  import("#/pages/PostsPage").then((m) => ({ default: m.PostsPage })),
);
const PostDetailPage = lazy(() =>
  import("#/pages/PostDetailPage").then((m) => ({ default: m.PostDetailPage })),
);

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
      {
        path: "/posts",
        element: (
          <Suspense fallback={null}>
            <PostsPage />
          </Suspense>
        ),
      },
      {
        path: "/posts/:slug",
        element: (
          <Suspense fallback={null}>
            <PostDetailPage />
          </Suspense>
        ),
      },
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
