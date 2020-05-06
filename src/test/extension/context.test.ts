import * as assert from "assert";
import { check, Environment } from "../../extension/context";

const document: Environment = {
  commands: {
    commandTrue: () => true,
    commandFalse: () => false,
    getObject: () => ({
      trueProperty: true,
      falseProperty: false,
      callback: (arg: any) => arg,
    }),
  },
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

  suite("cache", () => {
    let counter = 0;

    const document: Environment = {
      commands: {
        command: () => (counter += 1),
      },
    };

    setup(() => {
      counter = 0;
    });

    test("caches", async () => {
      await check(document, "[command(), command()]");
      assert.equal(counter, 1);
    });

    test("caches with args", async () => {
      await check(document, "[command(1), command(1)]");
      assert.equal(counter, 1);
    });

    test("caches with different args", async () => {
      await check(document, "[command(1), command(2)]");
      assert.equal(counter, 2);
    });
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
