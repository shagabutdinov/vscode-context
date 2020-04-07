export function parse(expression: string): Expression;

export type Expression = Command | Array | Object | Value;

export type Command = {
  command: string;
  args: Expression[];
  not?: boolean;
  chain: (CommandProperty | CommandMethod)[];
};

export type CommandProperty = { property: string };
export type CommandMethod = { method: string; args: Expression[] };
export type Array = { array: Expression[] };
export type Object = { object: Record<string, Expression> };
export type Value = { value: any };
