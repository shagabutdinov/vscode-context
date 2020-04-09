import * as vsc from "./lib/vsc";
import { parse, Expression, Command, Object } from "./grammar";
const isEqual = require("deep-equal");

export type Document = {
  execute: vsc.ExecuteCommand<any>;
  commands: Record<string, (...args: any) => Promise<any>>;
};

export async function check(
  document: Document,
  scope: string | string[],
): Promise<boolean> {
  if (scope instanceof Array) {
    scope = scope.join(" ");
  }

  const result = !!(await run(document, parse(scope)));
  return result;
}

async function run(document: Document, scope: Expression): Promise<any> {
  if ("value" in scope) {
    return scope.value;
  }

  if ("array" in scope) {
    return await runArray(document, scope.array);
  }

  if ("object" in scope) {
    return await runObject(document, scope);
  }

  if ("command" in scope) {
    return await runCommand(document, scope);
  }

  throw new Error("Unknown scope value: " + JSON.stringify(scope));
}

async function runArray(
  document: Document,
  array: Expression[],
): Promise<any[]> {
  const result: any = [];

  for (const value of array) {
    result.push(await run(document, value));
  }

  return result;
}

async function runObject(document: Document, scope: Object) {
  const result: any = {};

  for (const [key, value] of Object.entries(scope.object)) {
    result[key] = await run(document, value);
  }

  return result;
}

async function runCommand(document: Document, scope: Command) {
  if (scope.command === "and") {
    return runCommandAnd(document, scope);
  }

  if (scope.command === "or") {
    return runCommandOr(document, scope);
  }

  if (scope.command === "==") {
    return runCommandEqual(document, scope);
  }

  if (scope.command === "!=") {
    return !(await runCommandEqual(document, scope));
  }

  if (scope.command === "<") {
    return runCommandLesser(document, scope);
  }

  if (scope.command === "<=") {
    return runCommandLesserOrEqual(document, scope);
  }

  if (scope.command === ">") {
    return runCommandGreater(document, scope);
  }

  if (scope.command === ">=") {
    return runCommandGreaterOrEqual(document, scope);
  }

  return runCommandExternal(document, scope);
}

async function runCommandAnd(document: Document, scope: Command) {
  let result = true;
  for (const arg of scope.args) {
    result = result && (await run(document, arg));
  }

  return result;
}

async function runCommandOr(document: Document, scope: Command) {
  let result = false;
  for (const arg of scope.args) {
    result = result || (await run(document, arg));
  }

  return result;
}

async function runCommandEqual(document: Document, scope: Command) {
  const [left, right] = await getComparisonArgs(document, scope);
  return isEqual(left, right);
}

async function runCommandGreater(document: Document, scope: Command) {
  const [left, right] = await getComparisonArgs(document, scope);
  return left > right;
}

async function runCommandGreaterOrEqual(document: Document, scope: Command) {
  const [left, right] = await getComparisonArgs(document, scope);
  return left >= right;
}

async function runCommandLesser(document: Document, scope: Command) {
  const [left, right] = await getComparisonArgs(document, scope);
  return left < right;
}

async function runCommandLesserOrEqual(document: Document, scope: Command) {
  const [left, right] = await getComparisonArgs(document, scope);
  return left <= right;
}

async function getComparisonArgs(document: Document, scope: Command) {
  if (scope.args.length !== 2) {
    throw new Error(
      'Wrong number of arguments for "==" operator: ' + scope.args.length,
    );
  }

  return [
    await run(document, scope.args[0]),
    await run(document, scope.args[1]),
  ];
}

async function runCommandExternal(document: Document, scope: Command) {
  let result = await execute(document, scope);

  for (const part of scope.chain) {
    if ("property" in part) {
      if (!(part.property in result)) {
        throw new Error(
          'Unknown property "' +
            part.property +
            '" on the object: ' +
            JSON.stringify(result),
        );
      }

      result = result[part.property];
      continue;
    }

    if ("method" in part) {
      if (!(part.method in result)) {
        throw new Error(
          'Unknown method "' +
            part.method +
            '" on the object: ' +
            JSON.stringify(result),
        );
      }

      result = await result[part.method](
        ...(await runArray(document, part.args)),
      );

      continue;
    }

    throw new Error("Unknow chain part: " + JSON.stringify(part));
  }

  if (scope.not) {
    result = !result;
  }

  return result;
}

async function execute(document: Document, scope: Command): Promise<any> {
  const args = await runArray(document, scope.args);
  if (scope.command in document.commands) {
    const r = await document.commands[scope.command](...args);
    return await document.commands[scope.command](...args);
  }

  return await document.execute(`scope.${scope.command}`, ...args);
}
