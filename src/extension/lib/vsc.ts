export type ExecuteCommand<Type> = (
  command: string,
  ...rest: any[]
) => Thenable<Type>;

export type TextEditor = {
  document: TextDocument;
  selections: Selection[];
};

export type TextDocument = {
  lineCount: number;
  lineAt(line: number): TextLine;
  getText(range?: Range): string;
  offsetAt(position: Position): number;
  positionAt(offset: number): Position;
};

export type Selection = {
  active: Position;
  anchor: Position;
};

export type Range = {
  start: Position;
  end: Position;
};

export type Position = {
  character: number;
  line: number;
};

export type TextLine = {
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
  lineNumber: number;
  text: string;
};

export type Change = ChangeInsert | ChangeReplace | ChangeDelete;

export type ChangeInsert = {
  position: Position;
  value: string;
};

export function isChangeInsert(change: Change): change is ChangeInsert {
  return "position" in change;
}

export type ChangeReplace = {
  range: Range;
  value: string;
};

export function isChangeReplace(change: Change): change is ChangeReplace {
  return "range" in change && "value" in change;
}

export type ChangeDelete = {
  range: Range;
};

export function isChangeDelete(change: Change): change is ChangeDelete {
  return "range" in change && !("value" in change);
}
