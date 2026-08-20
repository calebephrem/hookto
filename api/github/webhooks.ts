import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import { createNodeMiddleware, createProbot } from "probot";
import app from "../../src/index.js";

const probot = createProbot();
const middlewarePromise = createNodeMiddleware(app, { probot });

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.statusCode = 405;

    return res.end("Method Not Allowed");
  }

  const githubEvent = req.headers["x-github-event"];
  const signature = req.headers["x-hub-signature-256"];
  const userAgent = (req.headers["user-agent"] as string) || "";

  if (!githubEvent) {
    res.statusCode = 400;

    return res.end("Bad Request: Missing X-GitHub-Event header");
  }

  if (!signature) {
    res.statusCode = 403;

    return res.end("Forbidden: Missing signature header");
  }

  if (!userAgent.startsWith("GitHub-Hookshot/")) {
    res.statusCode = 403;

    return res.end("Forbidden: Invalid User-Agent");
  }

  try {
    const middleware = await middlewarePromise;

    return middleware(req, res);
  } catch (error) {
    console.error("Error processing GitHub webhook:", error);

    res.statusCode = 500;

    return res.end("Internal Server Error");
  }
}
