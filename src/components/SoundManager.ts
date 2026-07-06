/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      // Khởi tạo AudioContext khi người dùng tương tác lần đầu
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playSnap() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.setValueAtTime(1200, t + 0.03);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Tiếng chuông chúc mừng vang lên (chord dẽ thương)
      const playTone = (freq: number, delay: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + delay + duration);
        
        gain.gain.setValueAtTime(0, t + delay);
        gain.gain.linearRampToValueAtTime(0.15, t + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + delay + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t + delay);
        osc.stop(t + delay + duration);
      };

      playTone(523.25, 0, 0.4);      // C5
      playTone(659.25, 0.1, 0.4);    // E5
      playTone(783.99, 0.2, 0.5);    // G5
      playTone(1046.50, 0.3, 0.6);   // C6
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(220, t);
      osc1.frequency.linearRampToValueAtTime(150, t + 0.25);
      
      osc2.frequency.setValueAtTime(223, t);
      osc2.frequency.linearRampToValueAtTime(153, t + 0.25);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  playFirework() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Tiếng xèo xèo bay lên rồi nổ
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
      
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.2);
      gain.gain.setValueAtTime(0, t + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);

      // Tiếng nổ đanh gọn
      setTimeout(() => {
        try {
          if (!this.ctx) return;
          const t2 = this.ctx.currentTime;
          const noiseOsc = this.ctx.createOscillator();
          const noiseGain = this.ctx.createGain();
          
          noiseOsc.type = 'triangle';
          noiseOsc.frequency.setValueAtTime(100, t2);
          noiseOsc.frequency.exponentialRampToValueAtTime(10, t2 + 0.5);
          
          noiseGain.gain.setValueAtTime(0.2, t2);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, t2 + 0.5);
          
          noiseOsc.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          noiseOsc.start(t2);
          noiseOsc.stop(t2 + 0.5);
        } catch (e){}
      }, 300);

    } catch (e) {}
  }
}

export const sound = new SoundManager();
