import { I18n, LANGUAGE_OPTIONS } from "./i18n.js";
import { SingingScorer } from "./scoring.js";
import { loadYouTubeIframeApi, parseYouTubeVideoId, YOUTUBE_ERROR_KEYS } from "./youtube.js";

const STORAGE_KEYS = Object.freeze({
  language: "karaokeInfinityLanguage"
});

const SELECTORS = Object.freeze({
  youtubeForm: "#youtubeForm",
  youtubeUrl: "#youtubeUrl",
  languageSelect: "#languageSelect",
  playerStatus: "#playerStatus",
  prevVideo: "#prevVideo",
  playVideo: "#playVideo",
  pauseVideo: "#pauseVideo",
  nextVideo: "#nextVideo",
  queueList: "#queueList",
  clearQueue: "#clearQueue",
  toggleMic: "#toggleMic",
  micStatus: "#micStatus",
  micDevice: "#micDevice",
  outputDevice: "#outputDevice",
  micGain: "#micGain",
  micGainValue: "#micGainValue",
  micDelay: "#micDelay",
  micDelayValue: "#micDelayValue",
  micMeter: "#micMeter",
  audioNote: "#audioNote",
  resetScore: "#resetScore",
  scoreDisplay: "#scoreDisplay",
  scoreValue: "#scoreValue",
  scoreGrade: "#scoreGrade",
  scorePower: "#scorePower",
  scorePitch: "#scorePitch",
  scoreConsistency: "#scoreConsistency",
  scoreStreak: "#scoreStreak",
  scoreNote: "#scoreNote"
});

const AUDIO_CONSTRAINTS = Object.freeze({
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false
});

function getElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function getElements() {
  return Object.fromEntries(
    Object.entries(SELECTORS).map(([name, selector]) => [name, getElement(selector)])
  );
}

class KaraokeInfinityApp {
  constructor(elements) {
    this.elements = elements;
    this.i18n = new I18n({ storageKey: STORAGE_KEYS.language });
    this.scorer = new SingingScorer();
    this.meterCanvasContext = elements.micMeter.getContext("2d");

    this.player = null;
    this.playerReady = false;
    this.isVideoPlaying = false;
    this.pendingVideoId = "";
    this.currentIndex = -1;
    this.queue = [];

    this.playerStatus = { type: "key", key: "playerWaiting", vars: {} };
    this.micStatus = { key: "micOff", vars: {}, isLive: false };
    this.audioNote = { key: "noteDefaultOutput", vars: {} };

    this.audio = {
      context: null,
      stream: null,
      source: null,
      delay: null,
      gain: null,
      meterAnalyser: null,
      scoreAnalyser: null,
      scoreSilencer: null,
      meterFrame: 0
    };
  }

  init() {
    this.populateLanguageOptions();
    this.bindEvents();
    this.applyMicSettings();
    this.drawIdleMeter();
    this.applyTranslations();
    this.createPlayer();
  }

  populateLanguageOptions() {
    this.elements.languageSelect.replaceChildren(
      ...LANGUAGE_OPTIONS.map(({ code, label }) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = label;
        return option;
      })
    );
  }

  bindEvents() {
    this.elements.youtubeForm.addEventListener("submit", (event) => this.handleSubmitUrl(event));
    this.elements.playVideo.addEventListener("click", () => this.player?.playVideo?.());
    this.elements.pauseVideo.addEventListener("click", () => this.player?.pauseVideo?.());
    this.elements.nextVideo.addEventListener("click", () => this.playNextVideo());
    this.elements.prevVideo.addEventListener("click", () => this.playPreviousVideo());
    this.elements.clearQueue.addEventListener("click", () => this.clearQueue());
    this.elements.resetScore.addEventListener("click", () => this.resetScore());
    this.elements.toggleMic.addEventListener("click", () => this.toggleMicrophone());
    this.elements.micGain.addEventListener("input", () => this.applyMicSettings());
    this.elements.micDelay.addEventListener("input", () => this.applyMicSettings());
    this.elements.micDevice.addEventListener("change", () => {
      if (this.audio.stream) this.startMicrophone();
    });
    this.elements.outputDevice.addEventListener("change", () => this.setOutputDevice());
    this.elements.languageSelect.addEventListener("change", () => {
      this.i18n.setLanguage(this.elements.languageSelect.value);
      this.applyTranslations();
    });
  }

  async createPlayer() {
    try {
      const youtube = await loadYouTubeIframeApi();
      this.player = new youtube.Player("player", {
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
          onReady: () => this.handlePlayerReady(),
          onStateChange: (event) => this.handlePlayerStateChange(event),
          onError: (event) => this.handlePlayerError(event)
        }
      });
    } catch {
      this.setPlayerStatusKey("videoErrorDefault");
    }
  }

  applyTranslations() {
    document.documentElement.lang = this.i18n.htmlLang;
    document.title = this.t("appTitle");
    this.elements.languageSelect.value = this.i18n.language;
    this.elements.languageSelect.setAttribute("aria-label", this.t("languageLabel"));

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = this.t(node.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
      node.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attribute, key] = pair.split(":").map((part) => part.trim());
        if (attribute && key) node.setAttribute(attribute, this.t(key));
      });
    });

    this.elements.queueList.dataset.empty = this.t("queueEmpty");
    this.renderPlayerStatus();
    this.renderMicStatus();
    this.renderAudioNote();
    this.renderQueue();
    this.renderScore();
    this.refreshAudioDevices();
  }

  t(key, vars = {}) {
    return this.i18n.t(key, vars);
  }

  setPlayerStatusKey(key, vars = {}) {
    this.playerStatus = { type: "key", key, vars };
    this.renderPlayerStatus();
  }

  setPlayerStatusText(text) {
    this.playerStatus = { type: "text", text };
    this.renderPlayerStatus();
  }

  renderPlayerStatus() {
    this.elements.playerStatus.textContent =
      this.playerStatus.type === "text"
        ? this.playerStatus.text
        : this.t(this.playerStatus.key, this.playerStatus.vars);
  }

  setMicStatusKey(key, isLive = false, vars = {}) {
    this.micStatus = { key, vars, isLive };
    this.renderMicStatus();
  }

  renderMicStatus() {
    this.elements.micStatus.textContent = this.t(this.micStatus.key, this.micStatus.vars);
    this.elements.micStatus.classList.toggle("is-live", this.micStatus.isLive);
    this.elements.toggleMic.textContent = this.t(this.audio.stream ? "turnMicOff" : "turnMicOn");
  }

  setAudioNoteKey(key, vars = {}) {
    this.audioNote = { key, vars };
    this.renderAudioNote();
  }

  renderAudioNote() {
    this.elements.audioNote.textContent = this.t(this.audioNote.key, this.audioNote.vars);
  }

  handleSubmitUrl(event) {
    event.preventDefault();

    const url = this.elements.youtubeUrl.value.trim();
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      this.setPlayerStatusKey("invalidUrl");
      this.elements.youtubeUrl.select();
      return;
    }

    const index = this.addVideoToQueue(videoId, url);
    this.playQueueIndex(index);
    this.elements.youtubeUrl.value = "";
  }

  addVideoToQueue(videoId, originalUrl) {
    const existingIndex = this.queue.findIndex((video) => video.id === videoId);
    if (existingIndex >= 0) return existingIndex;

    this.queue.push({
      id: videoId,
      url: originalUrl,
      title: this.t("videoFallbackTitle", { id: videoId })
    });
    this.renderQueue();
    return this.queue.length - 1;
  }

  renderQueue() {
    const items = this.queue.map((video, index) => {
      const item = document.createElement("li");
      item.className = `queue-item${index === this.currentIndex ? " is-active" : ""}`;

      const title = document.createElement("div");
      title.className = "queue-title";

      const heading = document.createElement("strong");
      heading.textContent = video.title;

      const source = document.createElement("span");
      source.textContent = video.url;

      const playButton = document.createElement("button");
      playButton.type = "button";
      playButton.title = this.t("queuePlayTitle");
      playButton.textContent = this.t("queuePlayButton");
      playButton.addEventListener("click", () => this.playQueueIndex(index));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.title = this.t("queueRemoveTitle");
      removeButton.textContent = this.t("queueRemoveButton");
      removeButton.addEventListener("click", () => this.removeQueueIndex(index));

      title.append(heading, source);
      item.append(title, playButton, removeButton);
      return item;
    });

    this.elements.queueList.replaceChildren(...items);
  }

  removeQueueIndex(index) {
    this.queue.splice(index, 1);
    if (this.currentIndex === index) {
      this.currentIndex = -1;
      this.resetScore();
    }
    if (this.currentIndex > index) this.currentIndex -= 1;
    this.renderQueue();
  }

  clearQueue() {
    this.queue = [];
    this.currentIndex = -1;
    this.resetScore();
    this.renderQueue();
  }

  playQueueIndex(index) {
    if (!this.queue[index]) return;

    const isNewSelection = this.currentIndex !== index;
    this.currentIndex = index;
    if (isNewSelection) this.resetScore();

    this.renderQueue();
    this.playVideoById(this.queue[index].id);
  }

  playVideoById(videoId) {
    if (!this.playerReady || !this.player) {
      this.pendingVideoId = videoId;
      this.setPlayerStatusKey("playerLoadingApi");
      return;
    }

    this.pendingVideoId = "";
    this.isVideoPlaying = false;
    this.player.loadVideoById(videoId);
    this.setPlayerStatusKey("playerLoadingVideo");
    window.setTimeout(() => this.updateCurrentTitle(), 1000);
  }

  playNextVideo() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.queue.length) this.playQueueIndex(nextIndex);
  }

  playPreviousVideo() {
    if (!this.queue.length) return;
    this.playQueueIndex(this.currentIndex <= 0 ? 0 : this.currentIndex - 1);
  }

  handlePlayerReady() {
    this.playerReady = true;
    this.setPlayerStatusKey("playerReady");
    if (this.pendingVideoId) this.playVideoById(this.pendingVideoId);
  }

  handlePlayerStateChange(event) {
    const states = window.YT?.PlayerState;
    if (!states) return;

    if (event.data === states.PLAYING) {
      this.isVideoPlaying = true;
      this.updateCurrentTitle();
      this.renderScore();
      return;
    }

    if (event.data === states.ENDED) {
      this.isVideoPlaying = false;
      this.renderScore();
      this.playNextVideo();
      return;
    }

    if ([states.PAUSED, states.BUFFERING, states.CUED].includes(event.data)) {
      this.isVideoPlaying = false;
      this.renderScore();
    }
  }

  handlePlayerError(event) {
    this.setPlayerStatusKey(YOUTUBE_ERROR_KEYS[event.data] || "videoErrorDefault");
  }

  updateCurrentTitle() {
    if (!this.player || this.currentIndex < 0 || !this.queue[this.currentIndex]) return;

    const data = this.player.getVideoData?.();
    if (!data?.title) return;

    this.queue[this.currentIndex].title = data.title;
    this.setPlayerStatusText(data.title);
    this.renderQueue();
  }

  async loadAudioDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      this.setSelectOptions(this.elements.micDevice, [{ value: "", label: this.t("inputUnavailable") }]);
      this.setSelectOptions(this.elements.outputDevice, [{ value: "", label: this.t("outputDefault") }]);
      return;
    }

    const currentInput = this.elements.micDevice.value;
    const currentOutput = this.elements.outputDevice.value;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === "audioinput");
    const outputs = devices.filter((device) => device.kind === "audiooutput");

    this.setSelectOptions(
      this.elements.micDevice,
      inputs.length
        ? inputs.map((device, index) => ({
            value: device.deviceId,
            label: device.label || this.t("inputFallback", { index: index + 1 })
          }))
        : [{ value: "", label: this.t("inputUnavailable") }],
      currentInput
    );

    this.setSelectOptions(
      this.elements.outputDevice,
      [
        { value: "", label: this.t("outputDefault") },
        ...outputs.map((device, index) => ({
          value: device.deviceId,
          label: device.label || this.t("outputFallback", { index: index + 1 })
        }))
      ],
      currentOutput
    );
  }

  refreshAudioDevices() {
    this.loadAudioDevices().catch(() => {
      this.setSelectOptions(this.elements.micDevice, [{ value: "", label: this.t("inputUnavailable") }]);
      this.setSelectOptions(this.elements.outputDevice, [{ value: "", label: this.t("outputDefault") }]);
    });
  }

  setSelectOptions(select, options, preferredValue = "") {
    select.replaceChildren(
      ...options.map(({ value, label }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        return option;
      })
    );

    if (options.some((option) => option.value === preferredValue)) {
      select.value = preferredValue;
    }
  }

  applyMicSettings() {
    const gainValue = Number(this.elements.micGain.value) / 100;
    const delayValue = Number(this.elements.micDelay.value) / 1000;

    this.elements.micGainValue.textContent = `${this.elements.micGain.value}%`;
    this.elements.micDelayValue.textContent = `${this.elements.micDelay.value} ms`;

    if (this.audio.gain) this.audio.gain.gain.value = gainValue;
    if (this.audio.delay) this.audio.delay.delayTime.value = delayValue;
  }

  async toggleMicrophone() {
    if (this.audio.stream) this.stopMicrophone();
    else await this.startMicrophone();
  }

  async startMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setMicStatusKey("micUnavailable");
      return;
    }

    this.stopMicrophone();

    const audioConstraints = { ...AUDIO_CONSTRAINTS };
    if (this.elements.micDevice.value) {
      audioConstraints.deviceId = { exact: this.elements.micDevice.value };
    }

    try {
      this.audio.stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      this.audio.context = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
      this.connectMicrophoneGraph();

      this.applyMicSettings();
      await this.setOutputDevice();
      await this.loadAudioDevices().catch(() => {});

      this.setMicStatusKey("micOn", true);
      this.setAudioNoteKey("noteFeedbackWarning");
      this.renderScore();
      this.drawMeter();
    } catch {
      this.stopMicrophone();
      this.setMicStatusKey("micPermissionDenied");
      this.setAudioNoteKey("noteMicOpenFailed");
    }
  }

  connectMicrophoneGraph() {
    const { context, stream } = this.audio;

    this.audio.source = context.createMediaStreamSource(stream);
    this.audio.delay = context.createDelay(0.25);
    this.audio.gain = context.createGain();
    this.audio.meterAnalyser = context.createAnalyser();
    this.audio.scoreAnalyser = context.createAnalyser();
    this.audio.scoreSilencer = context.createGain();

    this.audio.meterAnalyser.fftSize = 256;
    this.audio.meterAnalyser.smoothingTimeConstant = 0.82;
    this.audio.scoreAnalyser.fftSize = SingingScorer.fftSize;
    this.audio.scoreAnalyser.smoothingTimeConstant = 0;
    this.audio.scoreSilencer.gain.value = 0;

    this.audio.source.connect(this.audio.delay);
    this.audio.delay.connect(this.audio.gain);
    this.audio.gain.connect(this.audio.meterAnalyser);
    this.audio.gain.connect(this.audio.scoreAnalyser);
    this.audio.meterAnalyser.connect(context.destination);
    this.audio.scoreAnalyser.connect(this.audio.scoreSilencer);
    this.audio.scoreSilencer.connect(context.destination);
  }

  stopMicrophone() {
    if (this.audio.meterFrame) {
      cancelAnimationFrame(this.audio.meterFrame);
      this.audio.meterFrame = 0;
    }

    [
      this.audio.source,
      this.audio.delay,
      this.audio.gain,
      this.audio.meterAnalyser,
      this.audio.scoreAnalyser,
      this.audio.scoreSilencer
    ].forEach((node) => node?.disconnect());

    this.audio.stream?.getTracks().forEach((track) => track.stop());
    this.audio.context?.close?.().catch(() => {});

    this.audio = {
      context: null,
      stream: null,
      source: null,
      delay: null,
      gain: null,
      meterAnalyser: null,
      scoreAnalyser: null,
      scoreSilencer: null,
      meterFrame: 0
    };

    this.scorer.clearStreak();
    this.setMicStatusKey("micOff");
    this.renderScore();
    this.drawIdleMeter();
  }

  async setOutputDevice() {
    if (!this.audio.context || !this.elements.outputDevice.value) return;

    if (typeof this.audio.context.setSinkId !== "function") {
      this.setAudioNoteKey("noteBrowserDefault");
      return;
    }

    try {
      await this.audio.context.setSinkId(this.elements.outputDevice.value);
      this.setAudioNoteKey("noteOutputSelected");
    } catch {
      this.setAudioNoteKey("noteOutputFailed");
    }
  }

  resetScore() {
    this.scorer.reset();
    this.renderScore();
  }

  renderScore() {
    const snapshot = this.scorer.snapshot({
      hasMicrophone: Boolean(this.audio.stream),
      isVideoPlaying: this.isVideoPlaying
    });

    this.elements.scoreValue.textContent = String(snapshot.score);
    this.elements.scoreGrade.textContent = this.t(snapshot.gradeKey);
    this.elements.scorePower.textContent = `${snapshot.power}%`;
    this.elements.scorePitch.textContent = `${snapshot.pitch}%`;
    this.elements.scoreConsistency.textContent = `${snapshot.consistency}%`;
    this.elements.scoreStreak.textContent = `${snapshot.streak}${this.t("scoreSecondsSuffix")}`;
    this.elements.scoreNote.textContent = this.t(snapshot.noteKey);
    this.elements.scoreDisplay.style.setProperty("--score-percent", `${snapshot.score}%`);
  }

  drawIdleMeter() {
    const { width, height } = this.elements.micMeter;
    this.meterCanvasContext.clearRect(0, 0, width, height);
    this.meterCanvasContext.fillStyle = "#111318";
    this.meterCanvasContext.fillRect(0, 0, width, height);
    this.meterCanvasContext.fillStyle = "#2b313b";

    for (let x = 12; x < width; x += 26) {
      this.meterCanvasContext.fillRect(x, height - 26, 14, 14);
    }
  }

  drawMeter() {
    if (!this.audio.meterAnalyser) return;

    const { width, height } = this.elements.micMeter;
    const values = new Uint8Array(this.audio.meterAnalyser.frequencyBinCount);
    this.audio.meterAnalyser.getByteFrequencyData(values);

    this.meterCanvasContext.clearRect(0, 0, width, height);
    this.meterCanvasContext.fillStyle = "#111318";
    this.meterCanvasContext.fillRect(0, 0, width, height);

    const barGap = 4;
    const barWidth = Math.max(5, Math.floor(width / values.length) - barGap);

    values.forEach((value, index) => {
      const level = value / 255;
      const barHeight = Math.max(4, level * (height - 18));
      const x = index * (barWidth + barGap);
      const y = height - barHeight;
      this.meterCanvasContext.fillStyle = level > 0.72 ? "#d89b12" : "#0f8f7f";
      this.meterCanvasContext.fillRect(x, y, barWidth, barHeight);
    });

    this.scorer.update({
      analyser: this.audio.scoreAnalyser,
      sampleRate: this.audio.context?.sampleRate,
      isVideoPlaying: this.isVideoPlaying
    });
    this.renderScore();

    this.audio.meterFrame = requestAnimationFrame(() => this.drawMeter());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new KaraokeInfinityApp(getElements()).init();
});
