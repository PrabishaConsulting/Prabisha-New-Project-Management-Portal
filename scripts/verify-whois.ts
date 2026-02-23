import * as whois from "whois";
console.log("Keys:", Object.keys(whois));
try {
  // @ts-ignore
  if (whois.lookup) console.log("Found lookup");
  // @ts-ignore
  if (whois.default) console.log("Found default");
} catch (e) {
  console.error(e);
}
