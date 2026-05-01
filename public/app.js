const elements = {
  youtubeForm: document.querySelector("#youtubeForm"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  languageSelect: document.querySelector("#languageSelect"),
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
  audioNote: document.querySelector("#audioNote"),
  resetScore: document.querySelector("#resetScore"),
  scoreDisplay: document.querySelector("#scoreDisplay"),
  scoreValue: document.querySelector("#scoreValue"),
  scoreGrade: document.querySelector("#scoreGrade"),
  scorePower: document.querySelector("#scorePower"),
  scorePitch: document.querySelector("#scorePitch"),
  scoreConsistency: document.querySelector("#scoreConsistency"),
  scoreStreak: document.querySelector("#scoreStreak"),
  scoreNote: document.querySelector("#scoreNote")
};

let player = null;
let playerReady = false;
let isVideoPlaying = false;
let queuedVideos = [];
let currentIndex = -1;
let pendingVideoId = "";

let audioContext = null;
let micStream = null;
let micSource = null;
let micGain = null;
let micDelay = null;
let micAnalyser = null;
let micScoreAnalyser = null;
let meterFrame = 0;
let lastScoreUpdate = 0;

const meterCanvasContext = elements.micMeter.getContext("2d");
const scoreBuffer = new Float32Array(2048);

const scoreState = {
  score: 0,
  samples: 0,
  power: 0,
  pitch: 0,
  consistency: 0,
  streak: 0,
  lastPitch: 0,
  recentLevels: [],
  recentPitches: []
};

const translations = {
  en: {
    appTitle: "Karaoke Infinity",
    languageLabel: "Language",
    stageAria: "Stage",
    videoControlsAria: "Video controls",
    sidePanelAria: "Queue and microphone",
    youtubeLinkLabel: "YouTube link",
    playNowButton: "Play",
    previousButton: "Previous",
    previousTitle: "Previous video",
    playButton: "Play",
    playTitle: "Play video",
    pauseButton: "Pause",
    pauseTitle: "Pause video",
    nextButton: "Next",
    nextTitle: "Next video",
    queueHeading: "Queue",
    clearQueueButton: "Clear",
    microphoneHeading: "Microphone",
    inputLabel: "Input",
    outputLabel: "Output",
    gainLabel: "Gain",
    delayLabel: "Delay",
    micMeterAria: "Microphone level",
    queueEmpty: "No songs in the queue",
    videoFallbackTitle: "Video {id}",
    queuePlayTitle: "Play this video",
    queueRemoveTitle: "Remove from queue",
    queuePlayButton: "Play",
    queueRemoveButton: "Remove",
    playerWaiting: "Waiting for a YouTube link",
    playerReady: "Ready to play",
    playerLoadingApi: "Loading YouTube player",
    playerLoadingVideo: "Loading video",
    invalidUrl: "Paste a valid YouTube link",
    videoError2: "Invalid link",
    videoError5: "This video cannot play in the HTML player",
    videoError100: "Video unavailable",
    videoErrorEmbed: "This video blocks embedded playback",
    videoErrorDefault: "Could not play this video",
    micOff: "Microphone off",
    micOn: "Microphone on",
    micUnavailable: "Microphone unavailable",
    micPermissionDenied: "Microphone permission denied",
    turnMicOn: "Turn on",
    turnMicOff: "Turn off",
    inputUnavailable: "Microphone unavailable",
    inputFallback: "Microphone {index}",
    outputDefault: "Default output",
    outputFallback: "Output {index}",
    noteDefaultOutput: "Use the Windows default output to choose the speaker.",
    noteBrowserDefault: "This browser uses the system default output.",
    noteOutputSelected: "Audio output selected.",
    noteOutputFailed: "Could not switch the audio output.",
    noteFeedbackWarning: "Watch for feedback. Lower the gain if the sound starts ringing.",
    noteMicOpenFailed: "Could not open the microphone."
  },
  pt: {
    appTitle: "Karaoke Infinity",
    languageLabel: "Idioma",
    stageAria: "Palco",
    videoControlsAria: "Controles de video",
    sidePanelAria: "Fila e microfone",
    youtubeLinkLabel: "Link do YouTube",
    playNowButton: "Tocar",
    previousButton: "Anterior",
    previousTitle: "Video anterior",
    playButton: "Tocar",
    playTitle: "Tocar video",
    pauseButton: "Pausar",
    pauseTitle: "Pausar video",
    nextButton: "Proximo",
    nextTitle: "Proximo video",
    queueHeading: "Fila",
    clearQueueButton: "Limpar",
    microphoneHeading: "Microfone",
    inputLabel: "Entrada",
    outputLabel: "Saida",
    gainLabel: "Ganho",
    delayLabel: "Atraso",
    micMeterAria: "Nivel do microfone",
    queueEmpty: "Nenhuma musica na fila",
    videoFallbackTitle: "Video {id}",
    queuePlayTitle: "Tocar este video",
    queueRemoveTitle: "Remover da fila",
    queuePlayButton: "Tocar",
    queueRemoveButton: "Remover",
    playerWaiting: "Aguardando link do YouTube",
    playerReady: "Pronto para tocar",
    playerLoadingApi: "Carregando player do YouTube",
    playerLoadingVideo: "Carregando video",
    invalidUrl: "Cole um link valido do YouTube",
    videoError2: "Link invalido",
    videoError5: "Esse video nao pode tocar no player HTML",
    videoError100: "Video indisponivel",
    videoErrorEmbed: "Esse video bloqueia incorporacao",
    videoErrorDefault: "Nao foi possivel tocar esse video",
    micOff: "Microfone desligado",
    micOn: "Microfone ligado",
    micUnavailable: "Microfone indisponivel",
    micPermissionDenied: "Permissao do microfone negada",
    turnMicOn: "Ligar",
    turnMicOff: "Desligar",
    inputUnavailable: "Microfone indisponivel",
    inputFallback: "Microfone {index}",
    outputDefault: "Saida padrao",
    outputFallback: "Saida {index}",
    noteDefaultOutput: "Use a saida padrao do Windows para escolher o alto-falante.",
    noteBrowserDefault: "Este navegador usa a saida padrao do sistema.",
    noteOutputSelected: "Saida de audio selecionada.",
    noteOutputFailed: "Nao foi possivel trocar a saida de audio.",
    noteFeedbackWarning: "Cuidado com retorno. Baixe o ganho se o som apitar.",
    noteMicOpenFailed: "Nao foi possivel abrir o microfone."
  },
  es: {
    appTitle: "Karaoke Infinity",
    languageLabel: "Idioma",
    stageAria: "Escenario",
    videoControlsAria: "Controles de video",
    sidePanelAria: "Cola y microfono",
    youtubeLinkLabel: "Enlace de YouTube",
    playNowButton: "Reproducir",
    previousButton: "Anterior",
    previousTitle: "Video anterior",
    playButton: "Reproducir",
    playTitle: "Reproducir video",
    pauseButton: "Pausar",
    pauseTitle: "Pausar video",
    nextButton: "Siguiente",
    nextTitle: "Siguiente video",
    queueHeading: "Cola",
    clearQueueButton: "Limpiar",
    microphoneHeading: "Microfono",
    inputLabel: "Entrada",
    outputLabel: "Salida",
    gainLabel: "Ganancia",
    delayLabel: "Retraso",
    micMeterAria: "Nivel del microfono",
    queueEmpty: "No hay canciones en la cola",
    videoFallbackTitle: "Video {id}",
    queuePlayTitle: "Reproducir este video",
    queueRemoveTitle: "Quitar de la cola",
    queuePlayButton: "Reproducir",
    queueRemoveButton: "Quitar",
    playerWaiting: "Esperando un enlace de YouTube",
    playerReady: "Listo para reproducir",
    playerLoadingApi: "Cargando reproductor de YouTube",
    playerLoadingVideo: "Cargando video",
    invalidUrl: "Pega un enlace valido de YouTube",
    videoError2: "Enlace invalido",
    videoError5: "Este video no puede reproducirse en el reproductor HTML",
    videoError100: "Video no disponible",
    videoErrorEmbed: "Este video bloquea la reproduccion incorporada",
    videoErrorDefault: "No se pudo reproducir este video",
    micOff: "Microfono apagado",
    micOn: "Microfono encendido",
    micUnavailable: "Microfono no disponible",
    micPermissionDenied: "Permiso de microfono denegado",
    turnMicOn: "Encender",
    turnMicOff: "Apagar",
    inputUnavailable: "Microfono no disponible",
    inputFallback: "Microfono {index}",
    outputDefault: "Salida predeterminada",
    outputFallback: "Salida {index}",
    noteDefaultOutput: "Usa la salida predeterminada de Windows para elegir el altavoz.",
    noteBrowserDefault: "Este navegador usa la salida predeterminada del sistema.",
    noteOutputSelected: "Salida de audio seleccionada.",
    noteOutputFailed: "No se pudo cambiar la salida de audio.",
    noteFeedbackWarning: "Cuidado con la retroalimentacion. Baja la ganancia si el sonido empieza a silbar.",
    noteMicOpenFailed: "No se pudo abrir el microfono."
  },
  ja: {
    appTitle: "ローカルカラオケ",
    languageLabel: "言語",
    stageAria: "ステージ",
    videoControlsAria: "動画コントロール",
    sidePanelAria: "キューとマイク",
    youtubeLinkLabel: "YouTubeリンク",
    playNowButton: "再生",
    previousButton: "前へ",
    previousTitle: "前の動画",
    playButton: "再生",
    playTitle: "動画を再生",
    pauseButton: "一時停止",
    pauseTitle: "動画を一時停止",
    nextButton: "次へ",
    nextTitle: "次の動画",
    queueHeading: "キュー",
    clearQueueButton: "クリア",
    microphoneHeading: "マイク",
    inputLabel: "入力",
    outputLabel: "出力",
    gainLabel: "ゲイン",
    delayLabel: "遅延",
    micMeterAria: "マイクレベル",
    queueEmpty: "キューに曲がありません",
    videoFallbackTitle: "動画 {id}",
    queuePlayTitle: "この動画を再生",
    queueRemoveTitle: "キューから削除",
    queuePlayButton: "再生",
    queueRemoveButton: "削除",
    playerWaiting: "YouTubeリンクを待っています",
    playerReady: "再生準備完了",
    playerLoadingApi: "YouTubeプレイヤーを読み込み中",
    playerLoadingVideo: "動画を読み込み中",
    invalidUrl: "有効なYouTubeリンクを貼り付けてください",
    videoError2: "無効なリンクです",
    videoError5: "この動画はHTMLプレイヤーで再生できません",
    videoError100: "動画を利用できません",
    videoErrorEmbed: "この動画は埋め込み再生をブロックしています",
    videoErrorDefault: "この動画を再生できませんでした",
    micOff: "マイクはオフです",
    micOn: "マイクはオンです",
    micUnavailable: "マイクを利用できません",
    micPermissionDenied: "マイクの許可が拒否されました",
    turnMicOn: "オン",
    turnMicOff: "オフ",
    inputUnavailable: "マイクを利用できません",
    inputFallback: "マイク {index}",
    outputDefault: "既定の出力",
    outputFallback: "出力 {index}",
    noteDefaultOutput: "スピーカーを選ぶにはWindowsの既定の出力を使用してください。",
    noteBrowserDefault: "このブラウザーはシステムの既定の出力を使用します。",
    noteOutputSelected: "音声出力を選択しました。",
    noteOutputFailed: "音声出力を切り替えられませんでした。",
    noteFeedbackWarning: "ハウリングに注意してください。音が鳴り始めたらゲインを下げてください。",
    noteMicOpenFailed: "マイクを開けませんでした。"
  }
};

const languageCodes = {
  en: "en",
  pt: "pt-BR",
  es: "es",
  ja: "ja"
};

Object.assign(translations.en, {
  appTitle: "Karaoke Infinity",
  scoreAria: "Singing score",
  scoreHeading: "Singing Score",
  resetScoreButton: "Reset",
  scorePowerLabel: "Power",
  scorePitchLabel: "Pitch",
  scoreConsistencyLabel: "Consistency",
  scoreStreakLabel: "Streak",
  scoreSecondsSuffix: "s",
  gradeReady: "Ready",
  gradeWarmup: "Warmup",
  gradeGood: "Good",
  gradeGreat: "Great",
  gradeStar: "Star",
  gradeInfinity: "Infinity",
  scoreNoteNoMic: "Microphone off",
  scoreNotePaused: "Score paused",
  scoreNoteLive: "Listening",
  scoreNoteWaitingVoice: "Waiting for voice"
});

Object.assign(translations.pt, {
  appTitle: "Karaoke Infinity",
  scoreAria: "Pontuacao de canto",
  scoreHeading: "Pontuacao de Canto",
  resetScoreButton: "Reiniciar",
  scorePowerLabel: "Potencia",
  scorePitchLabel: "Afinacao",
  scoreConsistencyLabel: "Consistencia",
  scoreStreakLabel: "Sequencia",
  scoreSecondsSuffix: "s",
  gradeReady: "Pronto",
  gradeWarmup: "Aquecendo",
  gradeGood: "Bom",
  gradeGreat: "Otimo",
  gradeStar: "Estrela",
  gradeInfinity: "Infinito",
  scoreNoteNoMic: "Microfone desligado",
  scoreNotePaused: "Placar pausado",
  scoreNoteLive: "Ouvindo",
  scoreNoteWaitingVoice: "Aguardando voz"
});

Object.assign(translations.es, {
  appTitle: "Karaoke Infinity",
  scoreAria: "Puntuacion de canto",
  scoreHeading: "Puntuacion de Canto",
  resetScoreButton: "Reiniciar",
  scorePowerLabel: "Potencia",
  scorePitchLabel: "Afinacion",
  scoreConsistencyLabel: "Consistencia",
  scoreStreakLabel: "Racha",
  scoreSecondsSuffix: "s",
  gradeReady: "Listo",
  gradeWarmup: "Calentando",
  gradeGood: "Bien",
  gradeGreat: "Genial",
  gradeStar: "Estrella",
  gradeInfinity: "Infinito",
  scoreNoteNoMic: "Microfono apagado",
  scoreNotePaused: "Puntuacion en pausa",
  scoreNoteLive: "Escuchando",
  scoreNoteWaitingVoice: "Esperando voz"
});

Object.assign(translations.ja, {
  appTitle: "Karaoke Infinity",
  scoreAria: "歌唱スコア",
  scoreHeading: "歌唱スコア",
  resetScoreButton: "リセット",
  scorePowerLabel: "声量",
  scorePitchLabel: "音程",
  scoreConsistencyLabel: "安定感",
  scoreStreakLabel: "連続",
  scoreSecondsSuffix: "秒",
  gradeReady: "準備完了",
  gradeWarmup: "ウォームアップ",
  gradeGood: "グッド",
  gradeGreat: "グレート",
  gradeStar: "スター",
  gradeInfinity: "インフィニティ",
  scoreNoteNoMic: "マイクはオフです",
  scoreNotePaused: "スコアは一時停止中",
  scoreNoteLive: "リスニング中",
  scoreNoteWaitingVoice: "声を待っています"
});

let currentLanguage = localStorage.getItem("karaokeLanguage") || "en";
if (!translations[currentLanguage]) currentLanguage = "en";

let playerStatusState = { type: "key", key: "playerWaiting", vars: {} };
let micStatusState = { key: "micOff", vars: {}, isLive: false };
let audioNoteState = { key: "noteDefaultOutput", vars: {} };

function translate(key, vars = {}) {
  const catalog = translations[currentLanguage] || translations.en;
  const template = catalog[key] || translations.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function applyTranslations() {
  document.documentElement.lang = languageCodes[currentLanguage] || "en";
  document.title = translate("appTitle");
  elements.languageSelect.value = currentLanguage;
  elements.languageSelect.setAttribute("aria-label", translate("languageLabel"));

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = translate(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attribute, key] = pair.split(":").map((part) => part.trim());
      if (attribute && key) node.setAttribute(attribute, translate(key));
    });
  });

  elements.queueList.dataset.empty = translate("queueEmpty");
  refreshPlayerStatus();
  refreshMicStatus();
  refreshAudioNote();
  refreshScoreDisplay();
  renderQueue();
  loadAudioDevices();
}

function setPlayerStatusKey(key, vars = {}) {
  playerStatusState = { type: "key", key, vars };
  refreshPlayerStatus();
}

function setPlayerStatusText(text) {
  playerStatusState = { type: "text", text };
  refreshPlayerStatus();
}

function refreshPlayerStatus() {
  elements.playerStatus.textContent =
    playerStatusState.type === "text"
      ? playerStatusState.text
      : translate(playerStatusState.key, playerStatusState.vars);
}

function setMicStatusKey(key, isLive = false, vars = {}) {
  micStatusState = { key, vars, isLive };
  refreshMicStatus();
}

function refreshMicStatus() {
  elements.micStatus.textContent = translate(micStatusState.key, micStatusState.vars);
  elements.micStatus.classList.toggle("is-live", micStatusState.isLive);
  elements.toggleMic.textContent = translate(micStream ? "turnMicOff" : "turnMicOn");
}

function setAudioNoteKey(key, vars = {}) {
  audioNoteState = { key, vars };
  refreshAudioNote();
}

function refreshAudioNote() {
  elements.audioNote.textContent = translate(audioNoteState.key, audioNoteState.vars);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function resetScore() {
  scoreState.score = 0;
  scoreState.samples = 0;
  scoreState.power = 0;
  scoreState.pitch = 0;
  scoreState.consistency = 0;
  scoreState.streak = 0;
  scoreState.lastPitch = 0;
  scoreState.recentLevels = [];
  scoreState.recentPitches = [];
  refreshScoreDisplay();
}

function getScoreGradeKey(score) {
  if (!scoreState.samples) return "gradeReady";
  if (score >= 92) return "gradeInfinity";
  if (score >= 82) return "gradeStar";
  if (score >= 70) return "gradeGreat";
  if (score >= 55) return "gradeGood";
  return "gradeWarmup";
}

function getScoreNoteKey() {
  if (!micStream) return "scoreNoteNoMic";
  if (!isVideoPlaying) return "scoreNotePaused";
  if (scoreState.power < 8) return "scoreNoteWaitingVoice";
  return "scoreNoteLive";
}

function refreshScoreDisplay() {
  const score = Math.round(clamp(scoreState.score, 0, 100));
  elements.scoreValue.textContent = String(score);
  elements.scoreGrade.textContent = translate(getScoreGradeKey(score));
  elements.scorePower.textContent = `${Math.round(clamp(scoreState.power, 0, 100))}%`;
  elements.scorePitch.textContent = `${Math.round(clamp(scoreState.pitch, 0, 100))}%`;
  elements.scoreConsistency.textContent = `${Math.round(clamp(scoreState.consistency, 0, 100))}%`;
  elements.scoreStreak.textContent = `${Math.round(scoreState.streak)}${translate("scoreSecondsSuffix")}`;
  elements.scoreNote.textContent = translate(getScoreNoteKey());
  elements.scoreDisplay.style.setProperty("--score-percent", `${score}%`);
}

function calculateRms(buffer) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index] * buffer[index];
  }
  return Math.sqrt(sum / buffer.length);
}

function detectPitch(buffer, sampleRate, rms) {
  if (rms < 0.012) return { frequency: 0, confidence: 0 };

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.floor(sampleRate / 70), buffer.length - 1);
  let bestLag = 0;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    const limit = buffer.length - lag;

    for (let index = 0; index < limit; index += 1) {
      const left = buffer[index];
      const right = buffer[index + lag];
      correlation += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const normalized = correlation / Math.sqrt(leftEnergy * rightEnergy || 1);
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  if (!bestLag || bestCorrelation < 0.36) {
    return { frequency: 0, confidence: clamp(bestCorrelation) };
  }

  return {
    frequency: sampleRate / bestLag,
    confidence: clamp((bestCorrelation - 0.36) / 0.42)
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function updateSingingScore(now = performance.now()) {
  if (!micScoreAnalyser || !audioContext || now - lastScoreUpdate < 120) return;
  lastScoreUpdate = now;

  if (!isVideoPlaying) {
    scoreState.streak = 0;
    refreshScoreDisplay();
    return;
  }

  micScoreAnalyser.getFloatTimeDomainData(scoreBuffer);
  const rms = calculateRms(scoreBuffer);
  const voiceLevel = clamp((rms - 0.012) / 0.18);
  const hasVoice = voiceLevel > 0.07;

  if (!hasVoice) {
    scoreState.power *= 0.86;
    scoreState.pitch *= 0.9;
    scoreState.consistency *= 0.92;
    scoreState.streak = 0;
    refreshScoreDisplay();
    return;
  }

  const pitch = detectPitch(scoreBuffer, audioContext.sampleRate, rms);
  const idealPower = clamp(1 - Math.abs(voiceLevel - 0.56) / 0.56);
  let pitchScore = pitch.confidence;

  if (pitch.frequency && scoreState.lastPitch) {
    const cents = Math.abs(1200 * Math.log2(pitch.frequency / scoreState.lastPitch));
    pitchScore = pitchScore * 0.6 + clamp(1 - Math.min(cents, 260) / 260) * 0.4;
  }

  if (pitch.frequency) scoreState.lastPitch = pitch.frequency;

  scoreState.recentLevels.push(voiceLevel);
  scoreState.recentPitches.push(pitch.frequency ? 1 : 0);
  if (scoreState.recentLevels.length > 36) scoreState.recentLevels.shift();
  if (scoreState.recentPitches.length > 36) scoreState.recentPitches.shift();

  const levelAverage = average(scoreState.recentLevels);
  const levelVariance = average(scoreState.recentLevels.map((level) => (level - levelAverage) ** 2));
  const levelConsistency = clamp(1 - Math.sqrt(levelVariance) / 0.22);
  const pitchPresence = average(scoreState.recentPitches);
  const consistencyScore = levelConsistency * 0.65 + pitchPresence * 0.35;
  const sampleScore = (idealPower * 0.4 + pitchScore * 0.25 + consistencyScore * 0.35) * 100;

  scoreState.samples += 1;
  scoreState.score = scoreState.samples === 1 ? sampleScore : scoreState.score * 0.92 + sampleScore * 0.08;
  scoreState.power = scoreState.power * 0.68 + voiceLevel * 100 * 0.32;
  scoreState.pitch = scoreState.pitch * 0.72 + pitchScore * 100 * 0.28;
  scoreState.consistency = scoreState.consistency * 0.72 + consistencyScore * 100 * 0.28;
  scoreState.streak = sampleScore >= 64 ? scoreState.streak + 0.12 : 0;

  refreshScoreDisplay();
}

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
        setPlayerStatusKey("playerReady");
        if (pendingVideoId) playVideoById(pendingVideoId);
      },
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

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
    title: translate("videoFallbackTitle", { id: videoId })
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
    playButton.title = translate("queuePlayTitle");
    playButton.textContent = translate("queuePlayButton");
    playButton.addEventListener("click", () => playQueueIndex(index));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.title = translate("queueRemoveTitle");
    removeButton.textContent = translate("queueRemoveButton");
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

  const isNewSelection = currentIndex !== index;
  currentIndex = index;
  if (isNewSelection) resetScore();
  renderQueue();
  playVideoById(queuedVideos[index].id);
}

function playVideoById(videoId) {
  if (!playerReady || !player) {
    pendingVideoId = videoId;
    setPlayerStatusKey("playerLoadingApi");
    return;
  }

  pendingVideoId = "";
  isVideoPlaying = false;
  player.loadVideoById(videoId);
  setPlayerStatusKey("playerLoadingVideo");
  window.setTimeout(updateCurrentTitle, 1000);
}

function updateCurrentTitle() {
  if (!player || currentIndex < 0 || !queuedVideos[currentIndex]) return;

  const data = player.getVideoData ? player.getVideoData() : null;
  if (data && data.title) {
    queuedVideos[currentIndex].title = data.title;
    setPlayerStatusText(data.title);
    renderQueue();
  }
}

function onPlayerStateChange(event) {
  if (!window.YT || !YT.PlayerState) return;

  if (event.data === YT.PlayerState.PLAYING) {
    isVideoPlaying = true;
    updateCurrentTitle();
    refreshScoreDisplay();
  }

  if (event.data === YT.PlayerState.ENDED) {
    isVideoPlaying = false;
    playNextVideo();
  }

  if (
    event.data === YT.PlayerState.PAUSED ||
    event.data === YT.PlayerState.BUFFERING ||
    event.data === YT.PlayerState.CUED
  ) {
    isVideoPlaying = false;
    refreshScoreDisplay();
  }
}

function onPlayerError(event) {
  const errorMessages = {
    2: "videoError2",
    5: "videoError5",
    100: "videoError100",
    101: "videoErrorEmbed",
    150: "videoErrorEmbed"
  };
  setPlayerStatusKey(errorMessages[event.data] || "videoErrorDefault");
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
    setPlayerStatusKey("invalidUrl");
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
  resetScore();
  renderQueue();
});

elements.resetScore.addEventListener("click", resetScore);

async function loadAudioDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    elements.micDevice.innerHTML = `<option value="">${translate("inputUnavailable")}</option>`;
    elements.outputDevice.innerHTML = `<option value="">${translate("outputDefault")}</option>`;
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
    option.textContent = device.label || translate("inputFallback", { index: index + 1 });
    elements.micDevice.appendChild(option);
  });

  if (!inputs.length) {
    elements.micDevice.innerHTML = `<option value="">${translate("inputUnavailable")}</option>`;
  }

  elements.outputDevice.innerHTML = `<option value="">${translate("outputDefault")}</option>`;
  outputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || translate("outputFallback", { index: index + 1 });
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
    setAudioNoteKey("noteBrowserDefault");
    return;
  }

  try {
    await audioContext.setSinkId(elements.outputDevice.value);
    setAudioNoteKey("noteOutputSelected");
  } catch {
    setAudioNoteKey("noteOutputFailed");
  }
}

async function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMicStatusKey("micUnavailable");
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
    micScoreAnalyser = audioContext.createAnalyser();
    micAnalyser.fftSize = 256;
    micAnalyser.smoothingTimeConstant = 0.82;
    micScoreAnalyser.fftSize = 2048;
    micScoreAnalyser.smoothingTimeConstant = 0;

    micSource.connect(micDelay);
    micDelay.connect(micGain);
    micGain.connect(micAnalyser);
    micGain.connect(micScoreAnalyser);
    micAnalyser.connect(audioContext.destination);

    applyMicSettings();
    await setOutputDevice();
    await loadAudioDevices();

    setMicStatusKey("micOn", true);
    setAudioNoteKey("noteFeedbackWarning");
    refreshScoreDisplay();
    drawMeter();
  } catch (error) {
    stopMicrophone();
    setMicStatusKey("micPermissionDenied");
    setAudioNoteKey("noteMicOpenFailed");
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
  if (micScoreAnalyser) micScoreAnalyser.disconnect();

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
  micScoreAnalyser = null;
  scoreState.streak = 0;

  setMicStatusKey("micOff");
  refreshScoreDisplay();
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

  updateSingingScore();
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
elements.languageSelect.addEventListener("change", () => {
  currentLanguage = elements.languageSelect.value;
  localStorage.setItem("karaokeLanguage", currentLanguage);
  applyTranslations();
});

applyTranslations();
applyMicSettings();
drawIdleMeter();
