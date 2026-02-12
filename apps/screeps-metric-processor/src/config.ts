import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Config } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "config", "config.yaml");

function interpolateEnv(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)\}/g, (match, key) => {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Missing env var for ${match}`);
    }
    return value;
  });
}

export function loadConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const interpolated = interpolateEnv(raw);
  return yaml.load(interpolated) as Config;
}
