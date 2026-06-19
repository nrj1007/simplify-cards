const https = require("https");
const { URL } = require("url");

function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    };
    https.get(urlStr, options, (res) => {
      console.log(`URL: ${urlStr}, Status: ${res.statusCode}`);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, parsedUrl.href).href;
        console.log(`Redirecting to: ${redirectUrl}`);
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ html: data, statusCode: res.statusCode }));
    }).on("error", reject);
  });
}

const target = "https://cardmaven.in/jupiter-edge-csb-bank-rupay-credit-card/";

fetchUrl(target).then(({ html, statusCode }) => {
  console.log(`HTML Length: ${html.length}`);
  const imgTagsRegex = /<img[^>]+>/g;
  let match;
  console.log("Found images attributes:");
  while ((match = imgTagsRegex.exec(html)) !== null) {
    const tag = match[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    const dataSrc = tag.match(/data-src=["']([^"']+)["']/i)?.[1] || tag.match(/data-lazy-src=["']([^"']+)["']/i)?.[1];
    console.log(`Tag: ${tag.substring(0, 100)}...`);
    if (src) console.log(`  src: ${src}`);
    if (dataSrc) console.log(`  data-src: ${dataSrc}`);
  }
}).catch((err) => {
  console.error(err);
});
