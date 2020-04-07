import * as vscode from "vscode";
import { check } from "./extension/scope";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("scope.check", (args: any) =>
      check(vscode.commands.executeCommand, args),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "scope.selections",
      () => vscode.window.activeTextEditor?.selections,
    ),
  );
}

export function deactivate() {}
