import { ROLE_CONFIG, RoleName } from "../config";

export function isSupportedRole(role: unknown): role is RoleName {
  return typeof role === "string" && role in ROLE_CONFIG;
}
