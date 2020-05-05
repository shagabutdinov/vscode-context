import * as vsc from "./lib/vsc";
import { parse, Expression, Command, Object } from "./grammar";
const isEqual = require("deep-equal");

export type Document = {
  commands: Record<string, (...args: any) => any>;
};

export function check(document: Document, context: string | string[]): boolean {
  if (context instanceof Array) {
    context = context.join(" ");
  }

  return !!run(document, parse(context), {});
}

type Cache = Record<string, any>;

function run(document: Document, context: Expression, cache: Cache): any {
  if ("value" in context) {
    return context.value;
  }

  if ("array" in context) {
    return runArray(document, context.array, cache);
  }

  if ("object" in context) {
    return runObject(document, context, cache);
  }

  if ("command" in context) {
    return runCommand(document, context, cache);
  }

  throw new Error("Unknown context value: " + JSON.stringify(context));
}

function runArray(document: Document, array: Expression[], cache: Cache) {
  const result: any = [];
  for (const value of array) {
    result.push(run(document, value, cache));
  }

  return result;
}

function runObject(document: Document, context: Object, cache: Cache) {
  const result: any = {};

  for (const [key, value] of Object.entries(context.object)) {
    result[key] = run(document, value, cache);
  }

  return result;
}

function runCommand(document: Document, context: Command, cache: Cache) {
  if (context.command === "and") {
    return runCommandAnd(document, context, cache);
  }

  if (context.command === "or") {
    return runCommandOr(document, context, cache);
  }

  if (context.command === "==") {
    return runCommandEqual(document, context, cache);
  }

  if (context.command === "!=") {
    return !runCommandEqual(document, context, cache);
  }

  if (context.command === "<") {
    return runCommandLesser(document, context, cache);
  }

  if (context.command === "<=") {
    return runCommandLesserOrEqual(document, context, cache);
  }

  if (context.command === ">") {
    return runCommandGreater(document, context, cache);
  }

  if (context.command === ">=") {
    return runCommandGreaterOrEqual(document, context, cache);
  }

  return runCommandExternal(document, context, cache);
}

function runCommandAnd(document: Document, context: Command, cache: Cache) {
  let result = true;
  for (const arg of context.args) {
    result = result && run(document, arg, cache);
  }

  return result;
}

function runCommandOr(document: Document, context: Command, cache: Cache) {
  let result = false;
  for (const arg of context.args) {
    result = result || run(document, arg, cache);
  }

  return result;
}

function runCommandEqual(document: Document, context: Command, cache: Cache) {
  const [left, right] = getComparisonArgs(document, context, cache);
  return isEqual(left, right);
}

function runCommandGreater(document: Document, context: Command, cache: Cache) {
  const [left, right] = getComparisonArgs(document, context, cache);
  return left > right;
}

function runCommandGreaterOrEqual(
  document: Document,
  context: Command,
  cache: Cache,
) {
  const [left, right] = getComparisonArgs(document, context, cache);
  return left >= right;
}

function runCommandLesser(document: Document, context: Command, cache: Cache) {
  const [left, right] = getComparisonArgs(document, context, cache);
  return left < right;
}

function runCommandLesserOrEqual(
  document: Document,
  context: Command,
  cache: Cache,
) {
  const [left, right] = getComparisonArgs(document, context, cache);
  return left <= right;
}

function getComparisonArgs(document: Document, context: Command, cache: Cache) {
  if (context.args.length !== 2) {
    throw new Error(
      'Wrong number of arguments for "==" operator: ' + context.args.length,
    );
  }

  return [
    run(document, context.args[0], cache),
    run(document, context.args[1], cache),
  ];
}

function runCommandExternal(
  document: Document,
  context: Command,
  cache: Cache,
) {
  let result = execute(document, context, cache);

  for (const part of context.chain) {
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

      result = result[part.method](...runArray(document, part.args, cache));

      continue;
    }

    throw new Error("Unknow chain part: " + JSON.stringify(part));
  }

  if (context.not) {
    result = !result;
  }

  return result;
}

function execute(document: Document, context: Command, cache: Cache): any {
  const args = runArray(document, context.args, cache);
  const cacheKey = JSON.stringify([context.command, args]);

  if (cacheKey in cache) {
    return cache[cacheKey];
  }

  if (!(context.command in document.commands)) {
    throw new Error("Unknown context command: " + context.command);
  }

  const result = document.commands[context.command](...args);

  cache[cacheKey] = result;
  return result;
}
