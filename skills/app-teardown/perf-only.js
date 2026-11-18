// Loaded BEFORE motion-probe.js by `motion-pass.sh <fresh session> perf <url>`: the probe then records only frames,
// long tasks and CLS (no per-element sampling), so the reference/our build can be timed without the probe's own cost.
window.__mpPerfOnly = true;
