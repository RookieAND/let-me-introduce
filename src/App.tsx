import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PortfolioPage } from "#/pages/PortfolioPage";
import { PostsPage } from "#/pages/PostsPage";

const router = createBrowserRouter([
  { path: "/", element: <PortfolioPage /> },
  { path: "/posts", element: <PostsPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
