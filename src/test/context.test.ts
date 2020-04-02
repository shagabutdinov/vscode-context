import * as assert from "assert";
import { check } from "../extension/context";

const Commands: Record<string, (args: any) => boolean> = {
  "context.values.commandTrue": () => true,
  "context.values.commandFalse": () => false,
  "context.operators.==": ({ left, right }: { left: string; right: string }) =>
    left === right,
};

const run = async (command: string, args?: any) => {
  const result = Commands[command];
  if (result === undefined) {
    throw new Error("Unknown command: " + command);
  }

  return await Promise.resolve(result(args));
};

suite("Context", () => {
  test("returns true", async () => {
    assert.equal(true, await check(run, ["commandTrue"]));
  });

  test("returns false", async () => {
    assert.equal(false, await check(run, ["commandFalse"]));
  });

  test("returns false for and", async () => {
    assert.equal(
      false,
      await check(run, ["commandFalse", "and", "commandTrue"]),
    );
  });

  test("returns true for or", async () => {
    assert.equal(true, await check(run, ["commandFalse", "or", "commandTrue"]));
  });

  test("returns false for nested and", async () => {
    assert.equal(
      false,
      await check(run, [
        "commandFalse",
        "and",
        ["commandFalse", "and", "commandTrue"],
      ]),
    );
  });

  test("returns true for nested or", async () => {
    assert.equal(
      true,
      await check(run, [
        "commandFalse",
        "or",
        ["commandFalse", "or", "commandTrue"],
      ]),
    );
  });

  test("returns true for operator", async () => {
    assert.equal(true, await check(run, ["commandFalse", "==", false]));
  });

  test("returns false for operator", async () => {
    assert.equal(false, await check(run, ["commandTrue", "==", false]));
  });

  test("returns true for object expression", async () => {
    assert.equal(
      true,
      await check(run, [
        { context: "commandTrue", operator: "==", value: true },
      ]),
    );
  });

  test("returns false for object expression", async () => {
    assert.equal(
      false,
      await check(run, [
        {
          context: "commandTrue",
          operator: "==",
          value: false,
        },
      ]),
    );
  });

  test("negates", async () => {
    assert.equal(false, await check(run, ["!commandTrue"]));
  });

  test("negates with not", async () => {
    assert.equal(false, await check(run, ["not commandTrue"]));
  });

  test("negates operator", async () => {
    assert.equal(true, await check(run, ["commandTrue", "!==", false]));
  });

  test("negates operator with not", async () => {
    assert.equal(true, await check(run, ["commandTrue", "not ==", false]));
  });

  test("calls context command with arguments JSON", async () => {
    let result: any;
    const run = async (cmd: string, args?: any) => (result = [cmd, args]);
    await check(run, ['command(true, 1, "VALUE")']);
    assert.deepEqual(["context.values.command", [true, 1, "VALUE"]], result);
  });

  test("throws context error if JSON arguments can not be parsed", async () => {
    let result: any;
    const run = async (cmd: string, args?: any) => (result = [cmd, args]);

    try {
      await check(run, ['command("ERROR" "ERROR")']);
      assert.fail();
    } catch (error) {
      assert.equal(
        error.message,
        'Failed to parse arguments JSON ""ERROR" "ERROR"": Unexpected ' +
          "string in JSON at position 9",
      );
    }
  });

  test("parses context non-JSON arguments", async () => {
    let result: any;
    const run = async (cmd: string, args?: any) => (result = [cmd, args]);
    await check(run, ["command(true, 1, VALUE)"]);
    assert.deepEqual(["context.values.command", [true, 1, "VALUE"]], result);
  });

  test("parses context object arguments", async () => {
    let result: any;
    const run = async (cmd: string, args?: any) => (result = [cmd, args]);
    await check(run, [{ command: "command", args: "ARGS", not: true }]);
    assert.deepEqual(["context.values.command", "ARGS"], result);
  });

  test("calls operator command with arguments JSON", async () => {
    let result: any;

    const run = async (cmd: string, args?: any) =>
      (result = [cmd, args]) && null;

    await check(run, ["command", 'operator(true, 1, "VALUE")', "VALUE"]);

    assert.deepEqual(
      [
        "context.operators.operator",
        { args: [true, 1, "VALUE"], left: null, right: "VALUE" },
      ],
      result,
    );
  });

  test("throws operator error if JSON arguments can not be parsed", async () => {
    let result: any;
    const run = async (cmd: string, args?: any) => (result = [cmd, args]);

    try {
      await check(run, ["command", 'operator("ERROR" "ERROR")', "VALUE"]);
      assert.fail();
    } catch (error) {
      assert.equal(
        error.message,
        'Failed to parse arguments JSON ""ERROR" "ERROR"": Unexpected ' +
          "string in JSON at position 9",
      );
    }
  });

  test("parses operator non-JSON arguments", async () => {
    let result: any;

    const run = async (cmd: string, args?: any) =>
      (result = [cmd, args]) && null;

    await check(run, ["command", "operator(true, 1, VALUE)", "VALUE"]);

    assert.deepEqual(
      [
        "context.operators.operator",
        { args: [true, 1, "VALUE"], left: null, right: "VALUE" },
      ],
      result,
    );
  });

  test("parses operator object arguments", async () => {
    let result: any;

    const run = async (cmd: string, args?: any) =>
      (result = [cmd, args]) && null;

    await check(run, [
      "command",
      { command: "operator", args: "ARGS", not: true },
      "VALUE",
    ]);

    assert.deepEqual(
      [
        "context.operators.operator",
        { args: "ARGS", left: null, right: "VALUE" },
      ],
      result,
    );
  });
});
