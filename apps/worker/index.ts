interface ServiceConfig {
  name: string;
  version: number;
  isRunning: boolean;
}

const config: ServiceConfig = {
  name: "picScale-Worker",
  version: 1,
  isRunning: true,
};

function startService(cfg: ServiceConfig): void {
  console.log(`--- ${cfg.name} (v${cfg.version}) is now working (TS Mode) ---`);
}

startService(config);
