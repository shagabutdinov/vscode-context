import * as vsc from "./lib/vsc";

export async function check(
  executor: Executor,
  context: Context,
): Promise<boolean> {
  if (!(context instanceof Array)) {
    throw new Error("Unexpected context value: " + JSON.stringify(context));
  }

  let result = false;
  groupByCondition(context, "or").forEach(async orGroup => {
    result = result || (await checkOrGroup(executor, orGroup));
  });

  return result;
}

type Executor = vsc.ExecuteCommand<any>;

type Context = Value | Expression | Array<Context>;

type Value =
  | string
  | {
      context: string;
      not?: boolean;
      args?: any;
    };

type Expression = [Value, Operator, any];

type Operator =
  | string
  | {
      operator: string;
      not?: boolean;
      args?: any;
    };

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

function isExpression(value: Context[]): value is Expression {
  return value.length === 3 && isValue(value[0]) && isOperator(value[1]);
}

function isValue(value: any): value is Value {
  return (
    !(value instanceof Array) &&
    (typeof value === "string" || "context" in value)
  );
}

function isOperator(value: any): value is Operator {
  return (
    !(value instanceof Array) &&
    (typeof value === "string" || "operator" in value)
  );
}

async function checkOrGroup(executor: Executor, orGroup: Context[]) {
  return (
    await Promise.all(
      groupByCondition(orGroup, "and").map(async expression => {
        if (isExpression(expression)) {
          return await runOperator(
            executor,
            expression[1],
            await runValue(executor, expression[0]),
            expression[2],
          );
        }

        if (expression.length === 1) {
          if (isValue(expression[0])) {
            return await runContext(executor, expression[0]);
          }

          if (expression[0] instanceof Array) {
            return await check(executor, expression[0]);
          }
        }

        throw new Error("Invalid expression: " + JSON.stringify(expression));
      }),
    )
  ).every(Boolean);
}

async function runContext(
  executor: Executor,
  context: string | Value,
): Promise<boolean> {
  const [not, command, args] =
    typeof context === "string"
      ? extractExpression(context)
      : [context.not || false, context.context, context.args];

  return applyNegation(await executor(`context.values.${command}`, args), not);
}

async function runValue(
  executor: Executor,
  value: string | Value,
): Promise<boolean> {
  const [command, args] =
    typeof value === "string"
      ? extractArgs(value)
      : [value.context, value.args];

  return await executor(`context.values.${command}`, args);
}

async function runOperator(
  executor: Executor,
  operator: string | Operator,
  left: any,
  right: any,
): Promise<boolean> {
  const [not, command, args] =
    typeof operator === "string"
      ? extractExpression(operator)
      : [operator.not || false, operator.operator, operator.args];

  return applyNegation(
    await executor(`context.operators.${command}`, { ...args, left, right }),
    not,
  );
}

function extractExpression(value: string): [boolean, string, any] {
  const [valueWithoutNegation, isNegate] = extractNegation(value);
  const [valueWithoutArgs, args] = extractArgs(valueWithoutNegation);
  return [isNegate, valueWithoutArgs, args];
}

function extractNegation(value: string): [string, boolean] {
  const trimmed = value.trim();

  if (trimmed.startsWith("not")) {
    return [trimmed.substring(3).trim(), true];
  }

  return [value, false];
}

function extractArgs(context: string) {
  if (context.trim().endsWith(")")) {
    const [value, tail] = context.split("(", 1);
    return [value, JSON.parse("[" + tail.trim().substring(0, -1) + "]")];
  }

  return [context, undefined];
}

function applyNegation(value: any, negation: boolean): boolean {
  if (negation) {
    return !value;
  }

  return !!value;
}
