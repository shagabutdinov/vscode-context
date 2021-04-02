import * as vscode from "vscode";
import { check, checkSyntax } from "./extension/context";
import { create as createDocument } from "./extension/environment";

const document = createDocument();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("context.check", async (scope: any) => {
      vscode.window.showInformationMessage(
        "Context is: " + check(await document, scope).toString()
      );
    })
  );

  return {
    init: async () => {
      const documentObject = await document;

      return {
        check: (context: string | string[]) => check(documentObject, context),
        checkSyntax: (context: string | string[]) => checkSyntax(context),
      };
    },
  };
}

export function deactivate() {}
