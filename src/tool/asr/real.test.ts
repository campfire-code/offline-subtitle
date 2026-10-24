// 用本机真实的 ffmpeg 和示例文件验证抽音频；没有可运行的内置 ffmpeg（例如在其他平台）时自动跳过。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractAudio } from './extract';

const ffmpegPath = fileURLToPath(new URL('../../../src-tauri/binaries/ffmpeg-aarch64-apple-darwin', import.meta.url));
const sample = fileURLToPath(new URL('../../../samples/示例-整理房间.mp4', import.meta.url));
const runnable = process.platform === 'darwin' && process.arch === 'arm64' && existsSync(ffmpegPath) && existsSync(sample);

describe.skipIf(!runnable)('真实 ffmpeg 抽音频', () => {
  it('示例 mp4 → 16kHz 单声道采样，时长约 41 秒', async () => {
    const out = `${tmpdir()}/c06-real-test.wav`;
    const samples = await extractAudio({
      ffmpeg: async (args) => void execFileSync(ffmpegPath, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', ...args]),
      readFile: async (p) => new Uint8Array(readFileSync(p)),
      remove: async (p) => rmSync(p, { force: true }),
    }, sample, out);
    expect(samples.length / 16000).toBeGreaterThan(40);
    expect(samples.length / 16000).toBeLessThan(42.5);
    expect(samples.some((v) => Math.abs(v) > 0.05)).toBe(true);
    expect(existsSync(out)).toBe(false);
  });
});
