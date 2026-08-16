import pc from "picocolors";

const prefix = pc.bold(pc.magenta("hookto"));

export const logger = {
  info(msg: string) {
    console.log(`${prefix} ${pc.cyan("›")} ${msg}`);
  },

  success(msg: string) {
    console.log(`${prefix} ${pc.green("✓")} ${msg}`);
  },

  warn(msg: string) {
    console.warn(`${prefix} ${pc.yellow("⚠")} ${pc.yellow(msg)}`);
  },

  error(msg: string, err?: Error | string | unknown) {
    console.error(`${prefix} ${pc.red("✗")} ${pc.red(msg)}`);

    if (err) {
      console.log("\n");
      console.error(err instanceof Error ? err.message : String(err));
    }
  },

  debug(msg: string) {
    if (process.env.DISPOD_DEBUG) {
      console.log(`${prefix} ${pc.gray("·")} ${pc.gray(msg)}`);
    }
  },

  br() {
    console.log();
  },
};
