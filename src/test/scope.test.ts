import * as assert from "assert";
import { check, Document } from "../extension/scope";

const Commands: Record<string, (args: any) => any> = {
  "scope.commandTrue": () => true,
  "scope.commandFalse": () => false,
  "scope.getObject": () => ({
    trueProperty: true,
    falseProperty: false,
    callback: (arg: any) => arg,
  }),
};

const run = async (command: string, args?: any) => {
  const result = Commands[command];
  if (result === undefined) {
    throw new Error("Unknown command: " + command);
  }

  return await Promise.resolve(result(args));
};

const document: Document = {
  execute: run,
  commands: {},
};

suite("Context", () => {
  test("returns true", async () => {
    assert.equal(true, await check(document, "commandTrue()"));
  });

  test("returns false", async () => {
    assert.equal(false, await check(document, "commandFalse()"));
  });

  test("returns false for and", async () => {
    assert.equal(
      false,
      await check(document, "commandFalse() && commandTrue()"),
    );
  });

  test("returns true for or", async () => {
    assert.equal(
      true,
      await check(document, "commandFalse() || commandTrue()"),
    );
  });

  test("returns false for nested and", async () => {
    assert.equal(
      false,
      await check(
        document,
        "commandFalse() && (commandFalse() && commandTrue())",
      ),
    );
  });

  test("returns true for nested or", async () => {
    assert.equal(
      true,
      await check(
        document,
        "commandFalse() || (commandFalse() || commandTrue())",
      ),
    );
  });

  test("chains true property", async () => {
    assert.equal(true, await check(document, "getObject().trueProperty"));
  });

  test("chains false property", async () => {
    assert.equal(false, await check(document, "getObject().falseProperty"));
  });

  test("chains callback", async () => {
    assert.equal(
      true,
      await check(document, "getObject().callback({KEY: true}).KEY"),
    );
  });

  suite("operators", () => {
    test("negates", async () => {
      assert.equal(false, await check(document, "!commandTrue()"));
    });

    test("returns true for equals operator", async () => {
      assert.equal(true, await check(document, "0 == 0"));
    });

    test("returns false for equals operator", async () => {
      assert.equal(false, await check(document, "0 == 1"));
    });

    test("returns true for non-equals operator", async () => {
      assert.equal(true, await check(document, "0 != 1"));
    });

    test("returns false for non-equals operator", async () => {
      assert.equal(false, await check(document, "0 != 0"));
    });

    test("returns true for greater operator", async () => {
      assert.equal(true, await check(document, "1 > 0"));
    });

    test("returns false for greater operator", async () => {
      assert.equal(false, await check(document, "1 > 2"));
    });

    test("returns true for greater or equal operator", async () => {
      assert.equal(true, await check(document, "1 >= 1"));
    });

    test("returns false for greater or equal operator", async () => {
      assert.equal(false, await check(document, "1 >= 2"));
    });

    test("returns true for lesser operator", async () => {
      assert.equal(true, await check(document, "0 < 1"));
    });

    test("returns false for lesser operator", async () => {
      assert.equal(false, await check(document, "1 < 0"));
    });

    test("returns true for lesser or equal operator", async () => {
      assert.equal(true, await check(document, "1 <= 1"));
    });

    test("returns false for lesser or equal operator", async () => {
      assert.equal(false, await check(document, "2 <= 1"));
    });
  });
});
