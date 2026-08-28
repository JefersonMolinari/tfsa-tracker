import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";

const requiredSteps = [
  "npx wrangler login",
  "npx wrangler d1 create tfsa-tracker",
  "copy-d1-id",
  "npm run cf:types",
  "npm run d1:migrate:remote",
  "npx wrangler secret put TFSA_PASSWORD",
  "npx wrangler secret put TFSA_SESSION_SECRET",
  "npm run deploy",
];

function textContent(node) {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value;
  }

  return (node.children ?? []).map(textContent).join("");
}

function setupList(tree, heading) {
  const headingIndex = tree.children.findIndex(
    (node) => node.type === "heading" && textContent(node) === heading,
  );

  if (headingIndex === -1) {
    throw new Error(`Missing \"${heading}\" heading.`);
  }

  const section = tree.children.slice(headingIndex + 1);
  const nextHeadingIndex = section.findIndex((node) => node.type === "heading");
  const sectionNodes =
    nextHeadingIndex === -1 ? section : section.slice(0, nextHeadingIndex);
  const list = sectionNodes.find((node) => node.type === "list");

  if (!list || !list.ordered) {
    throw new Error(
      `The \"${heading}\" procedure must be an ordered Markdown list.`,
    );
  }

  return list;
}

function normalizedStep(item) {
  const content = textContent(item).trim();

  if (
    /before continuing/i.test(content) &&
    /database_id/.test(content) &&
    /wrangler\.jsonc/.test(content)
  ) {
    return "copy-d1-id";
  }

  return content;
}

async function checkDocument(path, heading) {
  const source = await readFile(resolve(path), "utf8");
  const tree = unified().use(remarkParse).parse(source);
  const steps = setupList(tree, heading).children.map(normalizedStep);

  if (JSON.stringify(steps.slice(0, requiredSteps.length)) !== JSON.stringify(requiredSteps)) {
    throw new Error(
      `${path} must place the D1 ID copy step immediately after D1 creation and before cf:types.`,
    );
  }
}

await checkDocument("README.md", "One-time hosted deployment setup");
await checkDocument("SETUP.md", "One-time Cloudflare setup");
