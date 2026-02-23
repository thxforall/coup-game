/**
 * Web Audio API 기반 사운드 매니저
 * 외부 오디오 파일 없이 프로그래밍 방식으로 효과음 생성
 */

type SoundType =
  | 'turnStart'
  | 'coinGain'
  | 'coinSpend'
  | 'challenge'
  | 'block'
  | 'cardLost'
  | 'victory'
  | 'defeat'
  | 'action'
  | 'notification'
  | 'pass'
  | 'gameStart';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay = 0,
    vol?: number,
  ) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime((vol ?? this.volume) * 0.5, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  private playNoise(duration: number, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }

  play(sound: SoundType) {
    if (typeof window === 'undefined' || !this.enabled) return;
    try {
      switch (sound) {
        case 'turnStart':
          // 상승 멜로디 — 3음
          this.playTone(523.25, 0.12, 'sine', 0);       // C5
          this.playTone(659.25, 0.12, 'sine', 0.1);     // E5
          this.playTone(783.99, 0.2, 'sine', 0.2);      // G5
          break;

        case 'coinGain':
          // 동전 소리 — 밝은 2음
          this.playTone(1200, 0.08, 'square', 0, 0.15);
          this.playTone(1600, 0.12, 'square', 0.06, 0.12);
          break;

        case 'coinSpend':
          // 코인 사용 — 낮은 하강
          this.playTone(600, 0.1, 'triangle', 0);
          this.playTone(400, 0.15, 'triangle', 0.08);
          break;

        case 'challenge':
          // 경고음 — 긴장감
          this.playTone(880, 0.08, 'sawtooth', 0, 0.2);
          this.playTone(660, 0.08, 'sawtooth', 0.08, 0.2);
          this.playTone(880, 0.08, 'sawtooth', 0.16, 0.2);
          this.playTone(1100, 0.2, 'sawtooth', 0.24, 0.25);
          break;

        case 'block':
          // 방패 소리 — 단단한 느낌
          this.playTone(300, 0.05, 'square', 0, 0.2);
          this.playNoise(0.08, 0);
          this.playTone(500, 0.15, 'triangle', 0.05, 0.15);
          break;

        case 'cardLost':
          // 하강 톤 — 슬픈 느낌
          this.playTone(440, 0.15, 'sine', 0);
          this.playTone(349.23, 0.15, 'sine', 0.12);
          this.playTone(261.63, 0.3, 'sine', 0.24);
          break;

        case 'victory':
          // 팡파레 — 승리
          this.playTone(523.25, 0.15, 'sine', 0);
          this.playTone(659.25, 0.15, 'sine', 0.12);
          this.playTone(783.99, 0.15, 'sine', 0.24);
          this.playTone(1046.5, 0.4, 'sine', 0.36);
          this.playTone(783.99, 0.1, 'triangle', 0.36);
          this.playTone(1046.5, 0.4, 'triangle', 0.48);
          break;

        case 'defeat':
          // 우울한 하강
          this.playTone(392, 0.2, 'sine', 0);
          this.playTone(349.23, 0.2, 'sine', 0.18);
          this.playTone(293.66, 0.2, 'sine', 0.36);
          this.playTone(261.63, 0.5, 'sine', 0.54);
          break;

        case 'action':
          // 일반 액션 — 부드러운 클릭
          this.playTone(800, 0.06, 'sine', 0, 0.15);
          this.playTone(1000, 0.08, 'sine', 0.04, 0.12);
          break;

        case 'notification':
          // 벨 소리 — 응답 필요
          this.playTone(880, 0.1, 'sine', 0);
          this.playTone(1100, 0.1, 'sine', 0.12);
          this.playTone(880, 0.1, 'sine', 0.24);
          break;

        case 'pass':
          // 가벼운 톡
          this.playTone(400, 0.05, 'sine', 0, 0.08);
          break;

        case 'gameStart':
          // 게임 시작 팡파레
          this.playTone(392, 0.1, 'sine', 0);
          this.playTone(523.25, 0.1, 'sine', 0.1);
          this.playTone(659.25, 0.1, 'sine', 0.2);
          this.playTone(783.99, 0.3, 'sine', 0.3);
          break;
      }
    } catch {
      // AudioContext 초기화 실패 시 무시
    }
  }
}

// 싱글턴
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null;
