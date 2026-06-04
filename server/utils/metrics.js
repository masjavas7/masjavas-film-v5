let requestCount = 0;
let errorCount = 0;
const startedAt = Date.now();

export function incrementRequests() {
  requestCount += 1;
}

export function incrementErrors() {
  errorCount += 1;
}

export function getMetricsSnapshot() {
  const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
  const mem = process.memoryUsage();
  return {
    uptimeSec,
    requestsTotal: requestCount,
    errorsTotal: errorCount,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    nodeVersion: process.version
  };
}