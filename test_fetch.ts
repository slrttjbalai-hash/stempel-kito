async function test() {
  const url = "https://script.google.com/macros/s/AKfycbzc8KJD9x28VETuAGz3y7-u6R-BEQ2aJTeRtonHUAP1CG_-7v1TBOtoR73yTB1XcjhyvQ/exec?action=getInitialData";
  console.log("Checking user's deployed script url:", url);
  try {
    const res = await fetch(url);
    console.log("STATUS CODE:", res.status);
    const text = await res.text();
    console.log("BODY RECV (first 500 chars):", text.slice(0, 500));
    try {
      const json = JSON.parse(text);
      console.log("PARSED SUCCESSFULLY!");
      console.log("KEYS:", Object.keys(json));
      if (json.facilitators) {
        console.log("FACILITATORS DETECTED:", json.facilitators.length);
      }
    } catch (pe) {
      console.error("Parsed failed, not a JSON response. Perhaps deployment permissions are incorrect (did you set Execute as: 'Me' and Anyone has access?)", pe);
    }
  } catch (e) {
    console.error("Fetch failed entirely:", e);
  }
}
test();
