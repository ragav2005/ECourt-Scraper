import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/scraper", "routes/scraper.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/logs", "routes/logs.tsx"),
] satisfies RouteConfig;
