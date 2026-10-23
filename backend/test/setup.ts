// Provider adapters must explicitly mock HTTP. This baseline survives vi.unstubAllGlobals().
globalThis.fetch = async () => { throw new Error("External HTTP is disabled in unit tests; install an explicit test mock"); };
