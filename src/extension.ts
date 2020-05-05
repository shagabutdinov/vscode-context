import * as vscode from "vscode";
import { check } from "./extension/context";
import { create as createDocument } from "./extension/document";

const document = createDocument();

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("context.check", async (scope: any) =>
      vscode.window.showInformationMessage(
        "Context is: " + check(await document, scope).toString(),
      ),
    ),
  );

  return {
    init: async () => {
      const documentObject = await document;

      return {
        check: (context: string | string[]) => check(documentObject, context),
      };
    },
  };
}

export function deactivate() {}
