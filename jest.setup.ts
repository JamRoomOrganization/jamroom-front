import "@testing-library/jest-dom";

const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

function isNoisyLog(args: unknown[]) {
  const first = args[0];
  return typeof first === "string" && first.startsWith("[");
}

jest.spyOn(console, "error").mockImplementation((...args: any[]) => {
  if (isNoisyLog(args)) {
    return;
  }
  return originalError(...args);
});

jest.spyOn(console, "log").mockImplementation((...args: any[]) => {
  if (isNoisyLog(args)) {
    return;
  }
  return originalLog(...args);
});

jest.spyOn(console, "warn").mockImplementation((...args: any[]) => {
  if (isNoisyLog(args)) {
    return;
  }
  return originalWarn(...args);
});

afterAll(() => {
  if ((console.error as any).mockRestore) {
    (console.error as any).mockRestore();
  }
  if ((console.log as any).mockRestore) {
    (console.log as any).mockRestore();
  }
  if ((console.warn as any).mockRestore) {
    (console.warn as any).mockRestore();
  }
});
