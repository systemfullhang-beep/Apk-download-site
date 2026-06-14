// Vercel Edge Function. Streams the APK from the GitHub repo when a user
// visits  https://<your-app>.vercel.app/<slug>
// vercel.json rewrites /:slug  ->  /api/dl?s=:slug

export const config = { runtime: "edge" };

const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || "main";

export default async function handler(req) {
  const url  = new URL(req.url);
  const slug = url.searchParams.get("s");

  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  // 1. Load the slug -> file map
  const linksUrl = https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/links.json;
  const linksRes = await fetch(linksUrl, { cache: "no-store" });
  if (!linksRes.ok) {
    return new Response("Storage not initialised", { status: 500 });
  }

  let links;
  try {
    links = await linksRes.json();
  } catch {
    return new Response("Invalid links.json", { status: 500 });
  }

  const entry = links[slug];
  if (!entry) {
    return new Response("Link not found", { status: 404 });
  }

  // 2. Stream the APK back to the user
  const apkUrl = https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${entry.path};
  const apkRes = await fetch(apkUrl);
  if (!apkRes.ok) {
    return new Response("File missing", { status: 404 });
  }

  const filename = entry.filename || ${slug}.apk;
  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": attachment; filename="${filename}",
    "Cache-Control": "public, max-age=300",
  });
  const cl = apkRes.headers.get("content-length");
  if (cl) headers.set("Content-Length", cl);

  return new Response(apkRes.body, { headers });
}
