import * as vscode from "vscode";

function getPrecedingText(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  let line = position.line - 1;
  while (line > 0) {
    const lineValue = document.lineAt(line);
    if (lineValue.firstNonWhitespaceCharacterIndex !== lineValue.text.length) {
      return document.getText(
        new vscode.Range(new vscode.Position(line, 0), position)
      );
    }

    line -= 1;
  }

  return document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );
}

function getFollowingText(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  let line = position.line + 1;
  while (line < document.lineCount - 1) {
    const lineValue = document.lineAt(line);

    if (lineValue.firstNonWhitespaceCharacterIndex !== lineValue.text.length) {
      return document.getText(
        new vscode.Range(
          position,
          new vscode.Position(line, lineValue.text.length)
        )
      );
    }

    line += 1;
  }

  return document.getText(
    new vscode.Range(
      position,
      new vscode.Position(
        document.lineCount - 1,
        document.lineAt(document.lineCount - 1).text.length
      )
    )
  );
}

const cursor: Record<string, (...args: any) => any> = {
  cursor: () => editor().selection,
  cursors: () => editor().selections,
  ["cursor.text"]: () => document().getText(new vscode.Range(start(), end())),
  ["cursor.precedingText"]: () => getPrecedingText(document(), active()),
  ["cursor.followingText"]: () => getFollowingText(document(), active()),
  ["cursor.anchorPrecedingText"]: () => getPrecedingText(document(), anchor()),
  ["cursor.anchorFollowingText"]: () => getFollowingText(document(), anchor()),
  ["cursor.startPrecedingText"]: () => getPrecedingText(document(), start()),
  ["cursor.startFollowingText"]: () => getFollowingText(document(), start()),
  ["cursor.endPrecedingText"]: () => getPrecedingText(document(), end()),
  ["cursor.endFollowingText"]: () => getFollowingText(document(), end()),
  ["cursor.bol"]: () => new vscode.Position(active().line, 0),
  ["cursor.bolNonEmpty"]: () =>
    new vscode.Position(
      active().line,
      document().lineAt(active()).firstNonWhitespaceCharacterIndex
    ),
  ["cursor.eol"]: () =>
    new vscode.Position(active().line, document().lineAt(active()).text.length),
};

const selection: Record<string, (...args: any) => any> = {
  selection: () => editor().selection,
  ["selection.text"]: () =>
    document().getText(new vscode.Range(start(), end())),
  ["selection.precedingText"]: () =>
    document().lineAt(active()).text.substring(0, active().character),
  ["selection.followingText"]: () =>
    document().lineAt(active()).text.substring(active().character),
  selections: () => editor().selections,
  ["selection.bol"]: () => new vscode.Position(active().line, 0),
  ["selection.bolNonEmpty"]: () =>
    new vscode.Position(
      active().line,
      document().lineAt(active()).firstNonWhitespaceCharacterIndex
    ),
  ["selection.eol"]: () =>
    new vscode.Position(active().line, document().lineAt(active()).text.length),
};

const commands: Record<string, (...args: any) => any> = {
  ...cursor,
  ...selection,
  ["range"]: (start, end) => new vscode.Range(start, end),
  ["position"]: (line: number, character: number) =>
    new vscode.Position(line, character),
  ["position.shift"]: (position: vscode.Position, value: number) =>
    document().positionAt(document().offsetAt(position) + value),
  ["editor"]: () => editor(),
  ["document"]: () => document(),
};

export default commands;

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
