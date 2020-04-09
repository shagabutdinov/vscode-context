import * as vscode from "vscode";
import { check, Document } from "./extension/scope";

export function activate(context: vscode.ExtensionContext) {
  const document: Document = {
    execute: vscode.commands.executeCommand,
    commands: {
      selection: async () => vscode.window.activeTextEditor?.selection,
      selections: async () => vscode.window.activeTextEditor?.selections,
    },
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("scope.check", (scope: any) =>
      check(document, scope),
    ),
  );
}

export function deactivate() {}
