export type TargetAuth = {
  email?: string;
  password?: string;
  token?: string;
};

export type Target = {
  id: string;
  type: string;
  baseUrl: string;
  auth?: TargetAuth;
  poll?: {
    latestSeconds?: number;
    intelSeconds?: number;
  };
  memoryPaths?: {
    latest?: string;
    intelRooms?: string;
  };
};

export type Config = {
  influx: {
    url: string;
    org: string;
    bucket: string;
    token: string;
  };
  targets: Target[];
  mappings?: Mapping[];
};

export type Primitive = number | boolean | string;

export type Mapping = {
  id: string;
  source: string;
  measurement: string;
  tags?: Record<string, string>;
  fields: Record<string, string>;
  iterate?: IterateConfig;
};

export type IterateConfig = {
  path?: string;
  tag: string;
  nested?: IterateConfig;
};
