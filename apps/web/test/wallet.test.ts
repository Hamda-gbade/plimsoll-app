import { describe, expect, it } from "vitest";
import { config } from "../lib/config";
import { WalletError, networkMismatchMessage } from "../lib/wallet";

const OTHER_PASSPHRASE = "Public Global Stellar Network ; September 2015";

describe("networkMismatchMessage", () => {
  it("stays quiet when the wallet is on the app's network", () => {
    expect(
      networkMismatchMessage(
        { network: "TESTNET", networkPassphrase: config.network.networkPassphrase },
        "Freighter",
      ),
    ).toBeNull();
  });

  it("names the wallet's network and the app's network when they differ", () => {
    const message = networkMismatchMessage(
      { network: "PUBLIC", networkPassphrase: OTHER_PASSPHRASE },
      "Freighter",
    );
    expect(message).toContain("Freighter is on PUBLIC");
    expect(message).toContain(`Plimsoll signs on ${config.networkName}`);
    expect(message).toContain(`Switch Freighter to ${config.networkName}`);
  });

  it("explains a passphrase mismatch when the network names look the same", () => {
    const message = networkMismatchMessage(
      { network: config.networkName, networkPassphrase: OTHER_PASSPHRASE },
      "xBull",
    );
    expect(message).toContain("different network passphrase");
  });

  it("does not guess when the wallet reports no passphrase", () => {
    expect(networkMismatchMessage({ network: "PUBLIC" }, "Albedo")).toBeNull();
    expect(networkMismatchMessage({}, "Albedo")).toBeNull();
  });
});

describe("WalletError", () => {
  it("is an Error with a readable name", () => {
    const error = new WalletError("No wallet was connected.");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WalletError");
    expect(error.message).toBe("No wallet was connected.");
  });
});
