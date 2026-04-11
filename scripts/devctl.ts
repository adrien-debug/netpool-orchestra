import { getRuntimeSnapshot, runNamedAction } from "../electron/runtime";

function usage() {
  console.log(`
Orchestra devctl

Usage:
  npm run devctl -- doctor
  npm run devctl -- status
  npm run devctl -- ports
  npm run devctl -- clean
  npm run devctl -- clean-zombies
  npm run devctl -- free-port 4000
  npm run devctl -- start <serviceId>
  npm run devctl -- stop <serviceId>
  npm run devctl -- restart <serviceId>
  npm run devctl -- profile <profileId>
  npm run devctl -- up
  npm run devctl -- up all
  npm run devctl -- rundev
  npm run devctl -- repair
  npm run devctl -- recovery
`);
}

function printSnapshot(snapshot: Awaited<ReturnType<typeof getRuntimeSnapshot>>) {
  console.log("\n=== Metrics ===");
  for (const metric of snapshot.metrics) {
    console.log(`- ${metric.label}: ${metric.value}${metric.hint ? ` (${metric.hint})` : ""}`);
  }

  console.log("\n=== Alerts ===");
  for (const alert of snapshot.alerts) {
    console.log(`- [${alert.severity}] ${alert.title}: ${alert.description}`);
  }

  console.log("\n=== Services ===");
  for (const service of snapshot.services) {
    console.log(
      `- ${service.id}: ${service.status} (${service.instances}/${service.expectedInstances}) CPU ${service.cpu} RAM ${service.memory}`
    );
  }

  console.log("\n=== Ports ===");
  for (const port of snapshot.ports.slice(0, 25)) {
    console.log(`- ${port.port}: ${port.processName} [pid=${port.pid}] ${port.status}`);
  }

  console.log("\n=== Docker ===");
  for (const container of snapshot.docker) {
    console.log(`- ${container.name} (${container.image}) ${container.status}`);
  }
}

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    usage();
    process.exit(1);
  }

  if (command === "doctor" || command === "status") {
    const snapshot = await getRuntimeSnapshot();
    printSnapshot(snapshot);
    return;
  }

  if (command === "ports") {
    const snapshot = await getRuntimeSnapshot();
    const unique = Array.from(
      new Map(snapshot.ports.map((p) => [`${p.pid}:${p.port}`, p])).values()
    ).sort((a, b) => a.port - b.port);

    console.log("\n=== Ports (all) ===");
    for (const p of unique) {
      console.log(`- ${p.port}: ${p.processName} [pid=${p.pid}] ${p.status}${p.serviceName ? ` [${p.serviceName}]` : ""}`);
    }
    return;
  }

  if (command === "clean") {
    const result = await runNamedAction("clean-duplicates");
    console.log("\n", result);
    return;
  }

  if (command === "clean-zombies") {
    const result = await runNamedAction("clean-zombies");
    console.log("\n", result);
    return;
  }

  if (command === "free-port") {
    const port = Number(rest[0] ?? "4000");
    const result = await runNamedAction("free-port", { port });
    console.log("\n", result);
    return;
  }

  if (command === "start") {
    const serviceId = rest[0];
    if (!serviceId) throw new Error("Missing serviceId");
    const result = await runNamedAction("service-start", { serviceId });
    console.log("\n", result);
    return;
  }

  if (command === "stop") {
    const serviceId = rest[0];
    if (!serviceId) throw new Error("Missing serviceId");
    const result = await runNamedAction("service-stop", { serviceId });
    console.log("\n", result);
    return;
  }

  if (command === "restart") {
    const serviceId = rest[0];
    if (!serviceId) throw new Error("Missing serviceId");
    const result = await runNamedAction("service-restart", { serviceId });
    console.log("\n", result);
    return;
  }

  if (command === "profile") {
    const profileId = rest[0];
    if (!profileId) throw new Error("Missing profileId");
    const result = await runNamedAction("profile-run", { profileId });
    console.log("\n", result);
    return;
  }

  if (command === "up") {
    const profileId = rest[0] ?? "fullstack";
    const result = await runNamedAction("profile-run", { profileId });
    console.log("\n", result);
    return;
  }

  if (command === "rundev") {
    const result = await runNamedAction("profile-run", { profileId: "fullstack" });
    console.log("\n", result);
    return;
  }

  if (command === "recovery") {
    const result = await runNamedAction("recovery-run");
    console.log("\n", result);
    return;
  }

  if (command === "repair") {
    const result = await runNamedAction("repair-now");
    console.log("\n", result);
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
