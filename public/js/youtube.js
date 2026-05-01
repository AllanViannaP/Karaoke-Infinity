const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

let apiPromise = null;

export const YOUTUBE_ERROR_KEYS = Object.freeze({
  2: "videoError2",
  5: "videoError5",
  100: "videoError100",
  101: "videoErrorEmbed",
  150: "videoErrorEmbed"
});

export function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve(window.YT);
    };

    const existingScript = document.querySelector(`script[src="${YOUTUBE_API_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("YouTube API failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = YOUTUBE_API_URL;
    script.async = true;
    script.onerror = () => reject(new Error("YouTube API failed to load"));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function parseYouTubeVideoId(value) {
  const raw = value.trim();
  if (VIDEO_ID_PATTERN.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    try {
      url = new URL(`https://${raw}`);
    } catch {
      return "";
    }
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let videoId = "";

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") || "";
    } else {
      const [section, id] = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(section)) videoId = id || "";
    }
  }

  return VIDEO_ID_PATTERN.test(videoId) ? videoId : "";
}
