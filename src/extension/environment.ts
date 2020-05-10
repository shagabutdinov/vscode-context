import * as vscode from "vscode";
import { Environment } from "extension/context";

export async function create(): Promise<Environment> {
  const config = vscode.workspace.getConfiguration();

  return {
    commands: await createCommands(config),
    debug: config.get<boolean>("debug") || false,
  };
}

async function createCommands(config: vscode.WorkspaceConfiguration) {
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

  return commands;
}

const defaultCommands: Record<string, (...args: any) => any> = {
  selection: () => editor().selection,
  ["selection.text"]: () =>
    document().getText(new vscode.Range(start(), end())),
  ["selection.precedingText"]: () =>
    document().lineAt(active()).text.substring(0, active().character),
  ["selection.followingText"]: () =>
    document().lineAt(active()).text.substring(active().character),
  ["selection.anchorPrecedingText"]: () =>
    document().lineAt(anchor()).text.substring(0, anchor().character),
  ["selection.anchorFollowingText"]: () =>
    document().lineAt(anchor()).text.substring(anchor().character),
  ["selection.startPrecedingText"]: () =>
    document().lineAt(start()).text.substring(0, start().character),
  ["selection.startFollowingText"]: () =>
    document().lineAt(start()).text.substring(start().character),
  ["selection.endPrecedingText"]: () =>
    document().lineAt(end()).text.substring(0, end().character),
  ["selection.endFollowingText"]: () =>
    document().lineAt(end()).text.substring(end().character),
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

function anchor() {
  return editor().selection.anchor;
}

function start() {
  return editor().selection.start;
}

function end() {
  return editor().selection.end;
}
