import { Point } from "@influxdata/influxdb-client";
import { getByPath } from "./utils";
import { IterateConfig, Mapping } from "./types";

type Context = Record<string, string>;
type TaggedItem = { obj: unknown; context: Context };

function resolveTemplate(template: string, context: Context): string | undefined {
  if (!template.includes("${")) return template;
  return template.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = context[key];
    return value === undefined ? match : value;
  });
}

function addTag(
  point: Point,
  tagName: string,
  tagValue: string | undefined
): void {
  if (!tagValue) return;
  point.tag(tagName, tagValue);
}

function coerceFieldValue(value: unknown): string | number | boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function applyFields(
  point: Point,
  fields: Record<string, string>,
  obj: unknown,
  root: unknown
): void {
  Object.entries(fields).forEach(([fieldName, path]) => {
    const value =
      path.startsWith("$root.")
        ? getByPath(root, path.slice("$root.".length))
        : path === "$root"
          ? root
          : getByPath(obj, path);
    const coerced = coerceFieldValue(value);
    if (coerced === undefined) return;
    if (typeof coerced === "number") {
      point.floatField(fieldName, coerced);
    } else if (typeof coerced === "boolean") {
      point.booleanField(fieldName, coerced);
    } else {
      point.stringField(fieldName, coerced);
    }
  });
}

function expandIterate(
  root: unknown,
  iterate: IterateConfig | undefined,
  context: Context
): TaggedItem[] {
  if (!iterate) return [{ obj: root, context }];
  const base =
    iterate.path && iterate.path.length > 0
      ? getByPath(root, iterate.path)
      : root;
  if (!base || typeof base !== "object") return [];

  const entries = Object.entries(base as Record<string, unknown>);
  const results: TaggedItem[] = [];
  entries.forEach(([key, value]) => {
    const nextContext: Context = { ...context, [iterate.tag]: key };
    if (iterate.nested) {
      results.push(...expandIterate(value, iterate.nested, nextContext));
    } else {
      results.push({ obj: value, context: nextContext });
    }
  });
  return results;
}

export function mapMemoryToPoints(
  targetId: string,
  source: string,
  memoryValue: unknown,
  mappings: Mapping[],
  now: Date
): Point[] {
  const points: Point[] = [];
  const baseContext: Context = { target: targetId };

  mappings
    .filter((mapping) => mapping.source === source)
    .forEach((mapping) => {
      const items = expandIterate(memoryValue, mapping.iterate, baseContext);
      items.forEach(({ obj, context }) => {
        const point = new Point(mapping.measurement).timestamp(now);
        const tags = mapping.tags ?? {};

        Object.entries(tags).forEach(([tagName, template]) => {
          const resolved = resolveTemplate(template, context);
          if (resolved && !resolved.includes("${")) {
            addTag(point, tagName, resolved);
          }
        });

        Object.keys(context).forEach((key) => {
          if (tags[key]) return;
          addTag(point, key, context[key]);
        });

        applyFields(point, mapping.fields, obj, memoryValue);

        if (point.fields && Object.keys(point.fields).length > 0) {
          points.push(point);
        }
      });
    });

  return points;
}
