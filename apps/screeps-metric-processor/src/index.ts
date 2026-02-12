import dotenv from "dotenv";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { ScreepsAPI } from "screeps-api";
import { loadConfig } from "./config";
import { createScreepsApi, fetchMemoryPath } from "./screeps";
import { mapMemoryToPoints } from "./mapper";
import { flattenValue } from "./utils";
import { Primitive, Target } from "./types";

dotenv.config();

async function run(): Promise<void> {
  const config = loadConfig();
  console.log(
    `Influx target url=${config.influx.url} org=${config.influx.org} bucket=${config.influx.bucket}`
  );

  const influx = new InfluxDB({
    url: config.influx.url,
    token: config.influx.token,
  });
  const writeApi = influx.getWriteApi(
    config.influx.org,
    config.influx.bucket,
    "ms"
  );

  const targets = config.targets || [];
  const apis = new Map<string, ScreepsAPI>();

  for (const target of targets) {
    apis.set(target.id, await createScreepsApi(target));
  }

  async function pollTargetPath(
    target: Target,
    api: ScreepsAPI,
    pathKey: string,
    memoryPath: string,
    intervalSeconds: number
  ): Promise<void> {
    const now = new Date();
    let memoryValue: unknown;

    try {
      memoryValue = await fetchMemoryPath(api, memoryPath);
    } catch (error) {
      console.error(
        `[${target.id}] failed to read memory path ${memoryPath}:`,
        error
      );
      return;
    }

    const mappings = config.mappings ?? [];
    const points =
      mappings.length > 0
        ? mapMemoryToPoints(target.id, pathKey, memoryValue, mappings, now)
        : [];

    if (points.length === 0) {
      const fields: Record<string, Primitive> = {};
      flattenValue(memoryValue, "", fields);

      if (Object.keys(fields).length === 0) {
        console.warn(
          `[${target.id}] no fields produced for ${memoryPath}; skipping write.`
        );
        return;
      }

      const point = new Point("screeps_memory")
        .tag("targetId", target.id)
        .tag("pathKey", pathKey)
        .timestamp(now);

      Object.entries(fields).forEach(([key, value]) => {
        if (typeof value === "number") {
          point.floatField(key, value);
        } else if (typeof value === "boolean") {
          point.booleanField(key, value);
        } else {
          point.stringField(key, String(value));
        }
      });
      points.push(point);
    }

    try {
      writeApi.writePoints(points);
      const measurementSet = new Set(points.map((point) => point.name));
      const measurements = Array.from(measurementSet).sort().join(", ");
      console.log(
        `[${target.id}@${memoryPath}] pushed ${points.length} points (${measurements})`
      );
    } catch (error) {
      console.error(
        `[${target.id}] failed to write point for ${memoryPath}:`,
        error
      );
    }
  }

  targets.forEach((target) => {
    const api = apis.get(target.id);
    if (!api) return;

    const polls = [
      {
        key: "latest",
        intervalSeconds: target.poll?.latestSeconds,
        memoryPath: target.memoryPaths?.latest,
      },
      {
        key: "intelRooms",
        intervalSeconds: target.poll?.intelSeconds,
        memoryPath: target.memoryPaths?.intelRooms,
      },
    ].filter(
      (entry): entry is {
        key: string;
        intervalSeconds: number;
        memoryPath: string;
      } => Boolean(entry.intervalSeconds && entry.memoryPath)
    );

    polls.forEach((entry) => {
      pollTargetPath(
        target,
        api,
        entry.key,
        entry.memoryPath,
        entry.intervalSeconds
      );
      setInterval(() => {
        pollTargetPath(
          target,
          api,
          entry.key,
          entry.memoryPath,
          entry.intervalSeconds
        );
      }, entry.intervalSeconds * 1000);
    });
  });

  const shutdown = async () => {
    try {
      await writeApi.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
