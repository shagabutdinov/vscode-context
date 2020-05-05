import * as vscode from "vscode";
import { Document } from "extension/context";

export async function create(): Promise<Document> {
  const config = vscode.workspace.getConfiguration();

  const extensions = Object.entries(
    config.get<Record<string, boolean>>("context.extensions") || {},
  );

  let commands: Record<string, (...args: any) => any> = {
    ...defaultCommands,
  };

  for (const [extensionName, isActive] of extensions) {
    if (!isActive) {
      continue;
    }

    const extensionObject = vscode.extensions.getExtension(extensionName);
    if (!extensionObject) {
      throw new Error(
        "Context extension declared but not found: " + extensionName,
      );
    }

    await extensionObject.activate();

    if (!extensionObject.exports?.contexts) {
      throw new Error(
        "Context extension does not have method: " +
          extensionName +
          ".contexts",
      );
    }

    commands = { ...commands, ...(await extensionObject.exports.contexts()) };
  }

  return { commands };
}

const defaultCommands: Record<string, (...args: any) => any> = {
  selection: () => editor().selection,
  ["selection.precedingText"]: () => document().lineAt(active()),
  selections: () => editor().selections,
  ["selection.bol"]: () => new vscode.Position(active().line, 0),
  ["selection.bolNonEmpty"]: () =>
    new vscode.Position(
      active().line,
      document().lineAt(active()).firstNonWhitespaceCharacterIndex,
    ),
  ["selection.eol"]: () =>
    new vscode.Position(active().line, document().lineAt(active()).text.length),
  ["range"]: (start, end) => new vscode.Range(start, end),
  ["position"]: (line: number, character: number) =>
    new vscode.Position(line, character),
  ["position.shift"]: (position: vscode.Position, value: number) =>
    document().positionAt(document().offsetAt(position) + value),
};

function editor() {
  const result = vscode.window.activeTextEditor;
  if (!result) {
    throw new Error("Active text editor is expected");
  }

  return result;
}

function document() {
  return editor().document;
}

function active() {
  return editor().selection.active;
}
