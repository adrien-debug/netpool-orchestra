declare module "pidusage" {
  type PidUsageRow = { cpu?: number; memory?: number; elapsed?: number };
  function pidusage(pids: number[] | number): Promise<Record<number, PidUsageRow>>;
  export default pidusage;
}
