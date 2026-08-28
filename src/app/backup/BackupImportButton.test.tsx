import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BackupImportButton } from "./BackupImportButton";

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> {
  if (isValidElement<Record<string, unknown>>(node)) {
    if (predicate(node)) return node;

    for (const child of Children.toArray(node.props.children as ReactNode)) {
      try {
        return findElement(child, predicate);
      } catch {
        // Continue through siblings until the requested element is found.
      }
    }
  }

  throw new Error("Expected element was not rendered.");
}

describe("BackupImportButton", () => {
  it("renders only a JSON file picker and its visible import control", () => {
    const view = BackupImportButton({ importAction: vi.fn() });
    const html = renderToStaticMarkup(view);
    const input = findElement(view, (element) => element.type === "input");

    expect(input.props).toMatchObject({
      accept: ".json,application/json",
      name: "backupFile",
      required: true,
      type: "file",
    });
    expect(html).toContain("Import full backup");
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).not.toContain("preview");
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("<textarea");
  });

  it("submits the containing form immediately after a file is selected", () => {
    const view = BackupImportButton({ importAction: vi.fn() });
    const input = findElement(view, (element) => element.type === "input");
    const requestSubmit = vi.fn();

    const onChange = input.props.onChange as (event: unknown) => void;
    onChange({ currentTarget: { form: { requestSubmit } } });

    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });
});
