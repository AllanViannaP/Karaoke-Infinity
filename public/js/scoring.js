const FFT_SIZE = 2048;
const MIN_RMS_FOR_PITCH = 0.012;
const MIN_VOICE_LEVEL = 0.07;
const SCORE_INTERVAL_MS = 120;
const MAX_RECENT_SAMPLES = 36;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function calculateRms(buffer) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index] * buffer[index];
  }
  return Math.sqrt(sum / buffer.length);
}

function detectPitch(buffer, sampleRate, rms) {
  if (rms < MIN_RMS_FOR_PITCH) return { frequency: 0, confidence: 0 };

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

function getGradeKey(score, samples) {
  if (!samples) return "gradeReady";
  if (score >= 92) return "gradeInfinity";
  if (score >= 82) return "gradeStar";
  if (score >= 70) return "gradeGreat";
  if (score >= 55) return "gradeGood";
  return "gradeWarmup";
}

function getNoteKey({ hasMicrophone, isVideoPlaying, power }) {
  if (!hasMicrophone) return "scoreNoteNoMic";
  if (!isVideoPlaying) return "scoreNotePaused";
  if (power < 8) return "scoreNoteWaitingVoice";
  return "scoreNoteLive";
}

export class SingingScorer {
  constructor() {
    this.buffer = new Float32Array(FFT_SIZE);
    this.reset();
  }

  static get fftSize() {
    return FFT_SIZE;
  }

  reset() {
    this.score = 0;
    this.samples = 0;
    this.power = 0;
    this.pitch = 0;
    this.consistency = 0;
    this.streak = 0;
    this.lastPitch = 0;
    this.lastUpdate = 0;
    this.recentLevels = [];
    this.recentPitches = [];
  }

  clearStreak() {
    this.streak = 0;
  }

  update({ analyser, sampleRate, isVideoPlaying, now = performance.now() }) {
    if (!analyser || !sampleRate || now - this.lastUpdate < SCORE_INTERVAL_MS) return this.snapshot();
    this.lastUpdate = now;

    if (!isVideoPlaying) {
      this.clearStreak();
      return this.snapshot();
    }

    analyser.getFloatTimeDomainData(this.buffer);

    const rms = calculateRms(this.buffer);
    const voiceLevel = clamp((rms - MIN_RMS_FOR_PITCH) / 0.18);
    const hasVoice = voiceLevel > MIN_VOICE_LEVEL;

    if (!hasVoice) {
      this.power *= 0.86;
      this.pitch *= 0.9;
      this.consistency *= 0.92;
      this.clearStreak();
      return this.snapshot();
    }

    const pitch = detectPitch(this.buffer, sampleRate, rms);
    const idealPower = clamp(1 - Math.abs(voiceLevel - 0.56) / 0.56);
    let pitchScore = pitch.confidence;

    if (pitch.frequency && this.lastPitch) {
      const cents = Math.abs(1200 * Math.log2(pitch.frequency / this.lastPitch));
      pitchScore = pitchScore * 0.6 + clamp(1 - Math.min(cents, 260) / 260) * 0.4;
    }

    if (pitch.frequency) this.lastPitch = pitch.frequency;

    this.recentLevels.push(voiceLevel);
    this.recentPitches.push(pitch.frequency ? 1 : 0);
    if (this.recentLevels.length > MAX_RECENT_SAMPLES) this.recentLevels.shift();
    if (this.recentPitches.length > MAX_RECENT_SAMPLES) this.recentPitches.shift();

    const levelAverage = average(this.recentLevels);
    const levelVariance = average(this.recentLevels.map((level) => (level - levelAverage) ** 2));
    const levelConsistency = clamp(1 - Math.sqrt(levelVariance) / 0.22);
    const pitchPresence = average(this.recentPitches);
    const consistencyScore = levelConsistency * 0.65 + pitchPresence * 0.35;
    const sampleScore = (idealPower * 0.4 + pitchScore * 0.25 + consistencyScore * 0.35) * 100;

    this.samples += 1;
    this.score = this.samples === 1 ? sampleScore : this.score * 0.92 + sampleScore * 0.08;
    this.power = this.power * 0.68 + voiceLevel * 100 * 0.32;
    this.pitch = this.pitch * 0.72 + pitchScore * 100 * 0.28;
    this.consistency = this.consistency * 0.72 + consistencyScore * 100 * 0.28;
    this.streak = sampleScore >= 64 ? this.streak + SCORE_INTERVAL_MS / 1000 : 0;

    return this.snapshot();
  }

  snapshot({ hasMicrophone = false, isVideoPlaying = false } = {}) {
    const score = Math.round(clamp(this.score, 0, 100));
    return {
      score,
      gradeKey: getGradeKey(score, this.samples),
      noteKey: getNoteKey({ hasMicrophone, isVideoPlaying, power: this.power }),
      power: Math.round(clamp(this.power, 0, 100)),
      pitch: Math.round(clamp(this.pitch, 0, 100)),
      consistency: Math.round(clamp(this.consistency, 0, 100)),
      streak: Math.round(this.streak)
    };
  }
}
