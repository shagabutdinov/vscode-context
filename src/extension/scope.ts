import { isEqual } from "lodash";
import * as vsc from "./lib/vsc";
import { parse, Expression, Command, Object } from "./grammar";

export async function check(
  executor: Executor,
  scope: string,
): Promise<boolean> {
  return !!(await run(executor, parse(scope)));
}

type Executor = vsc.ExecuteCommand<any>;

async function run(executor: Executor, scope: Expression): Promise<any> {
  if ("value" in scope) {
    return scope.value;
  }

  if ("array" in scope) {
    return await runArray(executor, scope.array);
  }

  if ("object" in scope) {
    return await runObject(executor, scope);
  }

  if ("command" in scope) {
    return await runCommand(executor, scope);
  }

  throw new Error("Unknown scope value: " + JSON.stringify(scope));
}

async function runArray(
  executor: Executor,
  array: Expression[],
): Promise<any[]> {
  const result: any = [];

  for (const value of array) {
    result.push(await run(executor, value));
  }

  return result;
}

async function runObject(executor: Executor, scope: Object) {
  const result: any = {};

  for (const [key, value] of Object.entries(scope.object)) {
    result[key] = await run(executor, value);
  }

  return result;
}

async function runCommand(executor: Executor, scope: Command) {
  if (scope.command === "and") {
    return runCommandAnd(executor, scope);
  }

  if (scope.command === "or") {
    return runCommandOr(executor, scope);
  }

  if (scope.command === "==") {
    return runCommandEqual(executor, scope);
  }

  if (scope.command === "!=") {
    return !(await runCommandEqual(executor, scope));
  }

  if (scope.command === "<") {
    return runCommandLesser(executor, scope);
  }

  if (scope.command === "<=") {
    return runCommandLesserOrEqual(executor, scope);
  }

  if (scope.command === ">") {
    return runCommandGreater(executor, scope);
  }

  if (scope.command === ">=") {
    return runCommandGreaterOrEqual(executor, scope);
  }

  return runCommandExternal(executor, scope);
}

async function runCommandAnd(executor: Executor, scope: Command) {
  let result = true;
  for (const arg of scope.args) {
    result = result && (await run(executor, arg));
  }

  return result;
}

async function runCommandOr(executor: Executor, scope: Command) {
  let result = false;
  for (const arg of scope.args) {
    result = result || (await run(executor, arg));
  }

  return result;
}

async function runCommandEqual(executor: Executor, scope: Command) {
  const [left, right] = await getComparisonArgs(executor, scope);
  return isEqual(left, right);
}

async function runCommandGreater(executor: Executor, scope: Command) {
  const [left, right] = await getComparisonArgs(executor, scope);
  return left > right;
}

async function runCommandGreaterOrEqual(executor: Executor, scope: Command) {
  const [left, right] = await getComparisonArgs(executor, scope);
  return left >= right;
}

async function runCommandLesser(executor: Executor, scope: Command) {
  const [left, right] = await getComparisonArgs(executor, scope);
  return left < right;
}

async function runCommandLesserOrEqual(executor: Executor, scope: Command) {
  const [left, right] = await getComparisonArgs(executor, scope);
  return left <= right;
}

async function getComparisonArgs(executor: Executor, scope: Command) {
  if (scope.args.length !== 2) {
    throw new Error(
      'Wrong number of arguments for "==" operator: ' + scope.args.length,
    );
  }

  const left = await run(executor, scope.args[0]);
  const right = await run(executor, scope.args[1]);

  return [left, right];
}

async function runCommandExternal(executor: Executor, scope: Command) {
  let result = await executor(
    `scope.${scope.command}`,
    await runArray(executor, scope.args),
  );

  for (const part of scope.chain) {
    if ("property" in part) {
      if (!result.hasOwnProperty(part.property)) {
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
      if (!result.hasOwnProperty(part.method)) {
        throw new Error(
          'Unknown method "' +
            part.method +
            '" on the object: ' +
            JSON.stringify(result),
        );
      }

      result = await result[part.method](
        ...(await runArray(executor, part.args)),
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
