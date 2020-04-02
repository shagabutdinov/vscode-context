import * as vsc from "./lib/vsc";

export async function check(
  executor: Executor,
  context: Context,
): Promise<boolean> {
  if (!(context instanceof Array)) {
    throw new Error("Unexpected context value: " + JSON.stringify(context));
  }

  let result = false;

  await Promise.all(
    groupByCondition(context, "or").map(async orGroup => {
      result = result || (await checkOrGroup(executor, orGroup));
    }),
  );

  return result;
}

type Executor = vsc.ExecuteCommand<any>;

type Context =
  | string
  | ObjectExpression
  | Command
  | ArrayExpression
  | Context[];

type ArrayExpression = [Command, Command, any];

type ObjectExpression = {
  context: Command;
  operator: Command;
  value: any;
};

type Command = string | { command: string; args: any; not?: boolean };

async function checkOrGroup(executor: Executor, orGroup: Context[]) {
  return (
    await Promise.all(
      groupByCondition(orGroup, "and").map(async part => {
        if (isArrayExpression(part)) {
          return await runExpression(executor, part[1], part[0], part[2]);
        }

        if (part.length > 1) {
          throw new Error("Invalid expression: " + JSON.stringify(part));
        }

        const value = part[0];

        if (isObjectExpression(value)) {
          return await runExpression(
            executor,
            value.operator,
            value.context,
            value.value,
          );
        }

        if (isCommand(value)) {
          return await runCommand(executor, value);
        }

        if (value instanceof Array) {
          return await check(executor, value);
        }

        throw new Error("Invalid expression: " + JSON.stringify(part));
      }),
    )
  ).every(Boolean);
}

function groupByCondition(context: Context[], operator: string): Context[][] {
  const results: Context[][] = [[]];

  let index = 0;
  context.forEach(value => {
    if (value === operator) {
      index += 1;
      results[index] = [];
      return;
    }

    results[index].push(value);
  });

  return results;
}

function isArrayExpression(value: Context[]): value is ArrayExpression {
  return value.length === 3 && isCommand(value[0]) && isCommand(value[1]);
}

function isObjectExpression(object: any): object is ObjectExpression {
  if (typeof object !== "object" || !object) {
    return false;
  }

  return (
    "context" in object &&
    isCommand(object.context) &&
    "operator" in object &&
    isCommand(object.operator) &&
    "value" in object
  );
}

function isCommand(object: any): object is Command {
  return (
    typeof object === "string" || ("command" in object && "args" in object)
  );
}

async function runCommand(
  executor: Executor,
  context: Command,
): Promise<boolean> {
  const [not, command, args] = extractExpression(context);
  return applyNegation(await executor(`context.values.${command}`, args), not);
}

async function runExpression(
  executor: Executor,
  operator: Command,
  context: Command,
  right: any,
): Promise<boolean> {
  const [not, operatorCommand, operatorArgs] = extractExpression(operator);
  const [, contextCommand, contextArgs] = extractExpression(context);
  const left = await executor(`context.values.${contextCommand}`, contextArgs);

  return applyNegation(
    await executor(`context.operators.${operatorCommand}`, {
      args: operatorArgs,
      left,
      right,
    }),
    not,
  );
}

function extractExpression(command: Command): [boolean, string, any] {
  if (typeof command === "string") {
    const [commandWithoutNegation, isNegate] = extractNegation(command);
    const [commandWithoutArgs, args] = extractArgs(commandWithoutNegation);
    return [isNegate, commandWithoutArgs, args];
  }

  return [command.not || false, command.command, command.args];
}

function extractNegation(value: string): [string, boolean] {
  const trimmed = value.trim();

  if (trimmed.startsWith("not ")) {
    return [trimmed.substring(4).trim(), true];
  }

  if (trimmed.startsWith("!")) {
    return [trimmed.substring(1).trim(), true];
  }

  return [value, false];
}

function extractArgs(context: string) {
  const match = context.match(/^(.*?)\((.*?)\)\s*$/);

  if (match) {
    const [, value, tail] = match;

    if (tail.includes('"')) {
      try {
        return [value, JSON.parse("[" + tail + "]")];
      } catch (error) {
        throw new Error(
          'Failed to parse arguments JSON "' + tail + '": ' + error.message,
        );
      }
    }

    return [
      value,
      tail
        .split(",")
        .map(value =>
          value.trim().match(/^\d+|true|false|null$/)
            ? JSON.parse(value)
            : value.trim(),
        ),
    ];
  }

  return [context, undefined];
}

function applyNegation(value: any, negation: boolean): boolean {
  if (negation) {
    return !value;
  }

  return !!value;
}
