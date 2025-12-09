const fs = require("node:fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.tracing.start();
  await page.goto("https://www.bandlab.com/", { waitUntil: "networkidle2" });
  const buffer = await page.tracing.stop();
  const json = Buffer.from(buffer).toString("utf8");
  const results = JSON.parse(json);
  const version = await page.$eval('meta[name="version"]', (el) => el.getAttribute("content"));
  await browser.close();
  fs.writeFileSync(`${version}-home.json`, JSON.stringify(results, null, 2) + "\n");
})();