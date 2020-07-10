import * as vscode from "vscode";
import { Environment } from "extension/context";
import defaultCommands from "./environment/commands";

export async function create(): Promise<Environment> {
  const config = vscode.workspace.getConfiguration();

  return {
    commands: await createCommands(config),
    debug: config.get<boolean>("context.debug") || false,
  };
}

async function createCommands(config: vscode.WorkspaceConfiguration) {
  const extensions = Object.entries(
    config.get<Record<string, boolean>>("context.extensions") || {}
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
        "Context extension declared but not found: " + extensionName
      );
    }

    await extensionObject.activate();

    if (!extensionObject.exports?.contexts) {
      throw new Error(
        "Context extension does not have method: " + extensionName + ".contexts"
      );
    }

    commands = { ...commands, ...(await extensionObject.exports.contexts()) };
  }

  return commands;
}

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
