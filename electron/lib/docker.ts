import { execa } from "execa";
import type { DockerItem } from "../../src/shared/types.js";

export async function listDockerContainers(): Promise<DockerItem[]> {
  try {
    const { stdout } = await execa("bash", [
      "-lc",
      "docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Status}}'"
    ], { timeout: 10000 });

    if (!stdout.trim()) return [];

    return stdout.split("\n").map((line, index) => {
      const [containerId, name, image, state, status] = line.split("\t");
      return {
        id: `docker-${index}`,
        containerId,
        name,
        image,
        state,
        status
      };
    });
  } catch {
    return [];
  }
}
