import Phaser from "phaser";

interface FloatData {
  speed: number;
  spin: number;
}

const SYMBOLS = ["×", "÷", "+", "−", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** 画布装饰：缓慢上浮的数学符号与数字，纯视觉，无游戏规则 */
export class FloatingBackground {
  private items: Phaser.GameObjects.Text[] = [];
  private data = new WeakMap<Phaser.GameObjects.Text, FloatData>();
  private colors: string[];

  constructor(
    private scene: Phaser.Scene,
    colors: number[],
    count = 22,
  ) {
    this.colors = colors.map((c) => `#${c.toString(16).padStart(6, "0")}`);
    for (let i = 0; i < count; i++) this.spawn(true);
  }

  private rand(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private spawn(first: boolean) {
    const text = this.scene.add.text(0, 0, this.pick(SYMBOLS), {
      fontFamily: "'Arial Rounded MT Bold', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      fontSize: `${Math.round(this.rand(16, 46))}px`,
      color: this.pick(this.colors),
    });
    text.setAlpha(this.rand(0.08, 0.32));
    text.setDepth(-10);
    const w = Math.max(this.scene.scale.width, 100);
    const h = Math.max(this.scene.scale.height, 100);
    text.setPosition(
      this.rand(0, w),
      first ? this.rand(0, h) : h + 40,
    );
    text.setRotation(this.rand(-0.5, 0.5));
    this.data.set(text, { speed: this.rand(10, 30), spin: this.rand(-0.5, 0.5) });
    this.items.push(text);
  }

  update(_time: number, delta: number) {
    const d = delta / 1000;
    for (const text of this.items) {
      const data = this.data.get(text);
      if (!data) continue;
      text.y -= data.speed * d;
      text.rotation += data.spin * d;
      if (text.y < -60) {
        text.setY(Math.max(this.scene.scale.height, 100) + 40);
        text.setX(this.rand(0, Math.max(this.scene.scale.width, 100)));
        data.spin = this.rand(-0.5, 0.5);
      }
    }
  }
}
