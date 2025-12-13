const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const data = (function () {
    try {
      return require("./home.json");
    } catch {
      return [];
    }
  })();
  const timestamp = new Date();
  const url = "https://www.bandlab.com/";
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.tracing.start();
  await page.goto(url, { waitUntil: "networkidle2" });
  const buffer = await page.tracing.stop();
  const json = Buffer.from(buffer).toString("utf8");
  const trace = JSON.parse(json);
  const version = await page.$eval('meta[name="version"]', (el) => el.getAttribute("content"));
  await browser.close();
  data.push({
    timestamp: timestamp.toISOString(),
    url,
    version,
    loadTime: getLoadTime(trace),
    scriptSize: getResourceSize("Script", trace),
    stylesheetSize: getResourceSize("Stylesheet", trace),
  });
  console.log(data);
  fs.writeFileSync("home.json", JSON.stringify(data, null, 2) + "\n");
})();

function getLoadTime({ traceEvents }) {
  const requestStarts = traceEvents.filter((e) => e.name === "ResourceSendRequest");
  const requestFinishes = traceEvents.filter((e) => e.name === "ResourceFinish");
  const firstStart = Math.min(...requestStarts.map((e) => e.ts));
  const lastFinish = Math.max(...requestFinishes.map((e) => e.ts));
  const total = lastFinish - firstStart;
  return total;
}

function getResourceSize(resourceType, { traceEvents }) {
  const requestIds = traceEvents
    .filter(
      (event) =>
        event.name === "ResourceSendRequest" &&
        event.args.data.resourceType === resourceType &&
        event.args.data.url.startsWith("https://www.bandlab.com/web-app/"),
    )
    .map((event) => event.args.data.requestId);
  const totalBytes = traceEvents
    .filter((e) => e.name === "ResourceFinish" && requestIds.includes(e.args.data.requestId))
    .reduce((sum, e) => sum + (e.args.data.decodedBodyLength || 0), 0);
  return totalBytes;
}
