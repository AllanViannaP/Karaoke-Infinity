const elements = {
  youtubeForm: document.querySelector("#youtubeForm"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  playerStatus: document.querySelector("#playerStatus"),
  prevVideo: document.querySelector("#prevVideo"),
  playVideo: document.querySelector("#playVideo"),
  pauseVideo: document.querySelector("#pauseVideo"),
  nextVideo: document.querySelector("#nextVideo"),
  queueList: document.querySelector("#queueList"),
  clearQueue: document.querySelector("#clearQueue"),
  toggleMic: document.querySelector("#toggleMic"),
  micStatus: document.querySelector("#micStatus"),
  micDevice: document.querySelector("#micDevice"),
  outputDevice: document.querySelector("#outputDevice"),
  micGain: document.querySelector("#micGain"),
  micGainValue: document.querySelector("#micGainValue"),
  micDelay: document.querySelector("#micDelay"),
  micDelayValue: document.querySelector("#micDelayValue"),
  micMeter: document.querySelector("#micMeter"),
  audioNote: document.querySelector("#audioNote")
};

let player = null;
let playerReady = false;
let queuedVideos = [];
let currentIndex = -1;
let pendingVideoId = "";

let audioContext = null;
let micStream = null;
let micSource = null;
let micGain = null;
let micDelay = null;
let micAnalyser = null;
let meterFrame = 0;

const meterCanvasContext = elements.micMeter.getContext("2d");

window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("player", {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      origin: window.location.origin
    },
    events: {
      onReady: () => {
        playerReady = true;
        setPlayerStatus("Pronto para tocar");
        if (pendingVideoId) playVideoById(pendingVideoId);
      },
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function setPlayerStatus(message) {
  elements.playerStatus.textContent = message;
}

function parseYouTubeVideoId(value) {
  const raw = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  let url = null;
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
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) {
        videoId = parts[1] || "";
      }
    }
  }

  return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : "";
}

function addVideoToQueue(videoId, originalUrl) {
  const existingIndex = queuedVideos.findIndex((video) => video.id === videoId);
  if (existingIndex >= 0) return existingIndex;

  queuedVideos.push({
    id: videoId,
    url: originalUrl,
    title: `Video ${videoId}`
  });
  renderQueue();
  return queuedVideos.length - 1;
}

function renderQueue() {
  elements.queueList.innerHTML = "";

  queuedVideos.forEach((video, index) => {
    const item = document.createElement("li");
    item.className = `queue-item${index === currentIndex ? " is-active" : ""}`;

    const title = document.createElement("div");
    title.className = "queue-title";

    const strong = document.createElement("strong");
    strong.textContent = video.title;

    const span = document.createElement("span");
    span.textContent = video.url;

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.title = "Tocar este video";
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => playQueueIndex(index));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.title = "Remover da fila";
    removeButton.textContent = "X";
    removeButton.addEventListener("click", () => removeQueueIndex(index));

    title.append(strong, span);
    item.append(title, playButton, removeButton);
    elements.queueList.appendChild(item);
  });
}

function removeQueueIndex(index) {
  queuedVideos.splice(index, 1);
  if (currentIndex === index) currentIndex = -1;
  if (currentIndex > index) currentIndex -= 1;
  renderQueue();
}

function playQueueIndex(index) {
  if (!queuedVideos[index]) return;

  currentIndex = index;
  renderQueue();
  playVideoById(queuedVideos[index].id);
}

function playVideoById(videoId) {
  if (!playerReady || !player) {
    pendingVideoId = videoId;
    setPlayerStatus("Carregando player do YouTube");
    return;
  }

  pendingVideoId = "";
  player.loadVideoById(videoId);
  setPlayerStatus("Carregando video");
  window.setTimeout(updateCurrentTitle, 1000);
}

function updateCurrentTitle() {
  if (!player || currentIndex < 0 || !queuedVideos[currentIndex]) return;

  const data = player.getVideoData ? player.getVideoData() : null;
  if (data && data.title) {
    queuedVideos[currentIndex].title = data.title;
    setPlayerStatus(data.title);
    renderQueue();
  }
}

function onPlayerStateChange(event) {
  if (!window.YT || !YT.PlayerState) return;

  if (event.data === YT.PlayerState.PLAYING) {
    updateCurrentTitle();
  }

  if (event.data === YT.PlayerState.ENDED) {
    playNextVideo();
  }
}

function onPlayerError(event) {
  const errorMessages = {
    2: "Link invalido",
    5: "Esse video nao pode tocar no player HTML",
    100: "Video indisponivel",
    101: "Esse video bloqueia incorporacao",
    150: "Esse video bloqueia incorporacao"
  };
  setPlayerStatus(errorMessages[event.data] || "Nao foi possivel tocar esse video");
}

function playNextVideo() {
  if (!queuedVideos.length) return;
  const nextIndex = currentIndex + 1;
  if (nextIndex < queuedVideos.length) {
    playQueueIndex(nextIndex);
  }
}

function playPreviousVideo() {
  if (!queuedVideos.length) return;
  const previousIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
  playQueueIndex(previousIndex);
}

elements.youtubeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = elements.youtubeUrl.value.trim();
  const videoId = parseYouTubeVideoId(url);

  if (!videoId) {
    setPlayerStatus("Cole um link valido do YouTube");
    elements.youtubeUrl.select();
    return;
  }

  const index = addVideoToQueue(videoId, url);
  playQueueIndex(index);
  elements.youtubeUrl.value = "";
});

elements.playVideo.addEventListener("click", () => {
  if (playerReady && player && player.playVideo) player.playVideo();
});

elements.pauseVideo.addEventListener("click", () => {
  if (playerReady && player && player.pauseVideo) player.pauseVideo();
});

elements.nextVideo.addEventListener("click", playNextVideo);
elements.prevVideo.addEventListener("click", playPreviousVideo);

elements.clearQueue.addEventListener("click", () => {
  queuedVideos = [];
  currentIndex = -1;
  renderQueue();
});

function setMicStatus(message, isLive = false) {
  elements.micStatus.textContent = message;
  elements.micStatus.classList.toggle("is-live", isLive);
}

async function loadAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    elements.micDevice.innerHTML = '<option value="">Microfone indisponivel</option>';
    elements.outputDevice.innerHTML = '<option value="">Saida padrao</option>';
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((device) => device.kind === "audioinput");
  const outputs = devices.filter((device) => device.kind === "audiooutput");

  const currentInput = elements.micDevice.value;
  const currentOutput = elements.outputDevice.value;

  elements.micDevice.innerHTML = "";
  inputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Microfone ${index + 1}`;
    elements.micDevice.appendChild(option);
  });

  if (!inputs.length) {
    elements.micDevice.innerHTML = '<option value="">Microfone indisponivel</option>';
  }

  elements.outputDevice.innerHTML = '<option value="">Saida padrao</option>';
  outputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Saida ${index + 1}`;
    elements.outputDevice.appendChild(option);
  });

  if ([...elements.micDevice.options].some((option) => option.value === currentInput)) {
    elements.micDevice.value = currentInput;
  }

  if ([...elements.outputDevice.options].some((option) => option.value === currentOutput)) {
    elements.outputDevice.value = currentOutput;
  }
}

function applyMicSettings() {
  const gainValue = Number(elements.micGain.value) / 100;
  const delayValue = Number(elements.micDelay.value) / 1000;

  elements.micGainValue.textContent = `${elements.micGain.value}%`;
  elements.micDelayValue.textContent = `${elements.micDelay.value} ms`;

  if (micGain) micGain.gain.value = gainValue;
  if (micDelay) micDelay.delayTime.value = delayValue;
}

async function setOutputDevice() {
  if (!audioContext || !elements.outputDevice.value) return;

  if (typeof audioContext.setSinkId !== "function") {
    elements.audioNote.textContent = "Este navegador usa a saida padrao do sistema.";
    return;
  }

  try {
    await audioContext.setSinkId(elements.outputDevice.value);
    elements.audioNote.textContent = "Saida de audio selecionada.";
  } catch {
    elements.audioNote.textContent = "Nao foi possivel trocar a saida de audio.";
  }
}

async function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMicStatus("Microfone indisponivel");
    return;
  }

  stopMicrophone();

  const deviceId = elements.micDevice.value;
  const audioConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  };

  if (deviceId) {
    audioConstraints.deviceId = { exact: deviceId };
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });

    micSource = audioContext.createMediaStreamSource(micStream);
    micDelay = audioContext.createDelay(0.25);
    micGain = audioContext.createGain();
    micAnalyser = audioContext.createAnalyser();
    micAnalyser.fftSize = 256;
    micAnalyser.smoothingTimeConstant = 0.82;

    micSource.connect(micDelay);
    micDelay.connect(micGain);
    micGain.connect(micAnalyser);
    micAnalyser.connect(audioContext.destination);

    applyMicSettings();
    await setOutputDevice();
    await loadAudioDevices();

    elements.toggleMic.textContent = "Desligar";
    setMicStatus("Microfone ligado", true);
    elements.audioNote.textContent = "Cuidado com retorno. Baixe o ganho se o som apitar.";
    drawMeter();
  } catch (error) {
    stopMicrophone();
    setMicStatus("Permissao do microfone negada");
    elements.audioNote.textContent = error.message || "Nao foi possivel abrir o microfone.";
  }
}

function stopMicrophone() {
  if (meterFrame) {
    cancelAnimationFrame(meterFrame);
    meterFrame = 0;
  }

  if (micSource) micSource.disconnect();
  if (micDelay) micDelay.disconnect();
  if (micGain) micGain.disconnect();
  if (micAnalyser) micAnalyser.disconnect();

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
  }

  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }

  audioContext = null;
  micStream = null;
  micSource = null;
  micDelay = null;
  micGain = null;
  micAnalyser = null;

  elements.toggleMic.textContent = "Ligar";
  setMicStatus("Microfone desligado");
  drawIdleMeter();
}

function drawIdleMeter() {
  const width = elements.micMeter.width;
  const height = elements.micMeter.height;
  meterCanvasContext.clearRect(0, 0, width, height);
  meterCanvasContext.fillStyle = "#111318";
  meterCanvasContext.fillRect(0, 0, width, height);
  meterCanvasContext.fillStyle = "#2b313b";
  for (let x = 12; x < width; x += 26) {
    meterCanvasContext.fillRect(x, height - 26, 14, 14);
  }
}

function drawMeter() {
  if (!micAnalyser) return;

  const width = elements.micMeter.width;
  const height = elements.micMeter.height;
  const values = new Uint8Array(micAnalyser.frequencyBinCount);
  micAnalyser.getByteFrequencyData(values);

  meterCanvasContext.clearRect(0, 0, width, height);
  meterCanvasContext.fillStyle = "#111318";
  meterCanvasContext.fillRect(0, 0, width, height);

  const barGap = 4;
  const barWidth = Math.max(5, Math.floor(width / values.length) - barGap);

  values.forEach((value, index) => {
    const level = value / 255;
    const barHeight = Math.max(4, level * (height - 18));
    const x = index * (barWidth + barGap);
    const y = height - barHeight;
    meterCanvasContext.fillStyle = level > 0.72 ? "#d89b12" : "#0f8f7f";
    meterCanvasContext.fillRect(x, y, barWidth, barHeight);
  });

  meterFrame = requestAnimationFrame(drawMeter);
}

elements.toggleMic.addEventListener("click", () => {
  if (micStream) {
    stopMicrophone();
  } else {
    startMicrophone();
  }
});

elements.micGain.addEventListener("input", applyMicSettings);
elements.micDelay.addEventListener("input", applyMicSettings);
elements.micDevice.addEventListener("change", () => {
  if (micStream) startMicrophone();
});
elements.outputDevice.addEventListener("change", setOutputDevice);

applyMicSettings();
drawIdleMeter();
loadAudioDevices();
