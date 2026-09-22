/**
 * Web Audio API Emergency Siren / Beep Generator
 * Produces an urgent oscillating alarm tone without needing external audio files.
 */
class EmergencySiren {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private intervalId: any = null;

  private initContext() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public async start() {
    if (this.isPlaying) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }

      this.osc = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      this.osc.type = "sawtooth";
      this.osc.frequency.setValueAtTime(850, this.audioCtx.currentTime);

      // Controlled volume so it is prominent but not deafening
      this.gainNode.gain.setValueAtTime(0.18, this.audioCtx.currentTime);

      this.osc.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.osc.start();
      this.isPlaying = true;

      // Oscillate frequency between 850Hz and 1050Hz to create standard emergency warble
      let highTone = false;
      this.intervalId = setInterval(() => {
        if (!this.osc || !this.audioCtx) return;
        const targetFreq = highTone ? 1050 : 850;
        this.osc.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.05);
        highTone = !highTone;
      }, 300);
    } catch (err) {
      console.warn("Could not play emergency audio siren:", err);
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      this.isPlaying = false;
    } catch (err) {
      console.warn("Error stopping siren:", err);
    }
  }

  public getStatus() {
    return this.isPlaying;
  }
}

export const emergencySiren = new EmergencySiren();
