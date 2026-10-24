// 主界面：选文件 → 识别 → 逐条改字幕 → 导出 SRT / TXT。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { AlertTriangle, FileAudio, FolderOpen, GitMerge, Play, Scissors, Search, Trash2 } from 'lucide-react';
import type { CustomTool } from '../kit/types';
import { ProgressBar, useDroppedFiles } from '../kit/parts';
import { fileSrc, pickFiles, pickFolder, reveal, settingsStore } from '../kit/platform';
import { checkSegments, mergeNext, parseTime, removeAt, replaceAll, shortTime, splitAt, toSrt, toTxt, MODELS, type Segment } from './asr';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, runJob, type Job, type Stage } from './engine';
import { DEMO_NAME, DEMO_SEGMENTS } from './samples';
import './tool.css';

type Ctx = Parameters<CustomTool['Main']>[0]['ctx'];
const EXTS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS];
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
const stem = (p: string) => baseName(p).replace(/\.[^.]+$/, '');
const isPreview = typeof location !== 'undefined' && location.pathname.endsWith('preview.html');

interface Prefs { model: string; language: 'chinese' | 'english'; simplified: boolean; maxWidth: number; localDir: string }
const DEFAULT_PREFS: Prefs = { model: 'small', language: 'chinese', simplified: true, maxWidth: 24, localDir: '' };

async function loadPrefs(): Promise<Prefs> {
  try {
    const v = await (await settingsStore()).get<Partial<Prefs>>('prefs');
    return { ...DEFAULT_PREFS, ...v };
  } catch {
    return DEFAULT_PREFS;
  }
}
async function savePrefs(p: Prefs) {
  try {
    await (await settingsStore()).set('prefs', p);
  } catch { /* 存不下不影响使用 */ }
}

export function Main({ ctx }: { ctx?: Ctx }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [file, setFile] = useState<string>(isPreview ? `/示例/${DEMO_NAME}` : '');
  const [segs, setSegs] = useState<Segment[]>(isPreview ? DEMO_SEGMENTS : []);
  const [stage, setStage] = useState<Stage | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const busy = stage !== null;

  useEffect(() => { if (!isPreview) void loadPrefs().then(setPrefs); }, []);
  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => { const n = { ...p, [k]: v }; void savePrefs(n); return n; });

  const choose = useCallback((p: string) => {
    if (busy) return;
    if (!EXTS.includes((p.split('.').pop() ?? '').toLowerCase())) { setMsg({ kind: 'err', text: `不支持这种文件：${baseName(p)}。支持常见视频（mp4、mov、mkv 等）和音频（mp3、wav、m4a 等）` }); return; }
    if (segs.length && dirty && !window.confirm('当前字幕有修改还没导出，换文件会丢掉。继续吗？')) return;
    setFile(p); setSegs([]); setDirty(false); setMsg(null);
  }, [busy, segs.length, dirty]);
  const hover = useDroppedFiles((paths) => paths[0] && choose(paths[0]));

  async function start() {
    if (!ctx || !file) return;
    if (segs.length && dirty && !window.confirm('重新识别会覆盖当前的修改。继续吗？')) return;
    const ac = new AbortController();
    abort.current = ac;
    setMsg(null); setStage({ step: 'extract', ratio: 0, text: '准备中…' });
    const job: Job = { path: file, model: prefs.model, language: prefs.language, simplified: prefs.simplified, maxWidth: prefs.maxWidth, localDir: prefs.localDir };
    try {
      const out = await runJob(ctx, job, setStage, ac.signal);
      setSegs(out); setDirty(false);
      setMsg({ kind: 'ok', text: `识别完成，共 ${out.length} 条字幕。下面可以逐条修改，改完再导出。` });
    } catch (e) {
      setMsg({ kind: 'err', text: ac.signal.aborted ? '已取消' : errText(e) });
    } finally {
      setStage(null); abort.current = null;
    }
  }

  const issues = useMemo(() => checkSegments(segs), [segs]);
  const bad = useMemo(() => new Set(issues.map((i) => i.index)), [issues]);
  const edit = (next: Segment[]) => { setSegs(next); setDirty(true); };
  const patch = (i: number, p: Partial<Segment>) => edit(segs.map((s, k) => (k === i ? { ...s, ...p } : s)));
  const play = (t: number) => { const a = audio.current; if (a) { a.currentTime = t; void a.play().catch(() => {}); } };

  async function exportAs(kind: 'srt' | 'txt') {
    if (!ctx) return;
    try {
      const path = await save({ defaultPath: `${stem(file) || '字幕'}.${kind}`, filters: [{ name: kind === 'srt' ? 'SRT 字幕' : '文本', extensions: [kind] }] });
      if (!path) return;
      // 带 BOM 的 UTF-8：Windows 自带播放器和旧软件打开中文不乱码
      await ctx.writeText(path, '﻿' + (kind === 'srt' ? toSrt(segs) : toTxt(segs)));
      setDirty(false);
      setMsg({ kind: 'ok', text: `已导出 ${baseName(path)}` });
      void reveal(path).catch(() => {});
    } catch (e) {
      setMsg({ kind: 'err', text: `导出失败：${errText(e)}` });
    }
  }

  return (
    <div className="os-root">
      <section className="k-panel os-source">
        <div className="os-file">
          <span className={`os-drop${hover ? ' hover' : ''}${file ? ' has' : ''}`}>
            <FileAudio size={22} aria-hidden />
            <span className="os-file-text">
              {file ? <><b className="k-ellipsis" title={file}>{baseName(file)}</b><span className="k-muted">可直接拖入新文件替换</span></> : <><b>把视频或音频拖到这里</b><span className="k-muted">mp4、mov、mkv、mp3、wav、m4a 等，文件不会上传</span></>}
            </span>
          </span>
          <button className="k-btn" disabled={busy} onClick={async () => { const p = (await pickFiles(EXTS, '视频或音频'))[0]; if (p) choose(p); }}>选择文件…</button>
          {busy ? <button className="k-btn" onClick={() => abort.current?.abort()}>取消</button> : <button className="k-btn primary" disabled={!file || !ctx} onClick={start}>{segs.length ? '重新识别' : '开始识别'}</button>}
        </div>
        <div className="os-opts">
          <div className="os-opt"><span className="k-label">识别语言</span>
            <span className="k-seg" role="group" aria-label="识别语言">
              {([['chinese', '中文'], ['english', 'English']] as const).map(([k, l]) => <button key={k} className={prefs.language === k ? 'on' : ''} aria-pressed={prefs.language === k} disabled={busy} onClick={() => setPref('language', k)}>{l}</button>)}
            </span>
          </div>
          <div className="os-opt"><label className="k-label" htmlFor="os-model">识别模型</label>
            <select id="os-model" className="k-input" value={prefs.model} disabled={busy} onChange={(e) => setPref('model', e.target.value)}>{MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </div>
          <div className="os-opt"><label className="k-label" htmlFor="os-width">每条字幕长度</label>
            <select id="os-width" className="k-input" value={prefs.maxWidth} disabled={busy} onChange={(e) => setPref('maxWidth', Number(e.target.value))}>
              <option value={16}>短（约 16 个字，适合竖屏）</option><option value={24}>中（约 24 个字）</option><option value={32}>长（约 32 个字）</option>
            </select>
          </div>
          {prefs.language === 'chinese' && <label className="os-opt os-check"><input type="checkbox" checked={prefs.simplified} disabled={busy} onChange={(e) => setPref('simplified', e.target.checked)} /><span>统一成简体中文、规范标点</span></label>}
        </div>
        <div className="os-model-row">
          <span className="k-muted">{prefs.localDir ? <>使用本地模型文件夹：<span title={prefs.localDir}>{baseName(prefs.localDir)}</span></> : '模型第一次使用时自动下载，之后离线可用。下载不了可手动指定模型文件夹。'}</span>
          <button className="k-btn os-sm" disabled={busy} onClick={async () => { const d = await pickFolder(); if (d) setPref('localDir', d); }}><FolderOpen size={14} aria-hidden />指定本地模型文件夹…</button>
          {prefs.localDir && <button className="k-btn os-sm" disabled={busy} onClick={() => setPref('localDir', '')}>改回自动下载</button>}
        </div>
        {stage && <div className="os-progress" role="status"><ProgressBar ratio={stage.ratio} label={stage.text} /><span className="k-muted">{stage.text}</span></div>}
        {msg && <div className={`os-msg ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>{msg.text}</div>}
      </section>

      {segs.length > 0 && (
        <Editor segs={segs} issues={issues.length} bad={bad} file={file} audioRef={audio} edit={edit} patch={patch} play={play} onExport={exportAs} />
      )}
      {!segs.length && !busy && <div className="os-empty k-muted">选好文件，点「开始识别」。识别在本机完成，不联网（仅首次需要下载模型），不需要显卡。</div>}
    </div>
  );
}

function Editor(props: {
  segs: Segment[]; issues: number; bad: Set<number>; file: string; audioRef: React.RefObject<HTMLAudioElement | null>;
  edit: (s: Segment[]) => void; patch: (i: number, p: Partial<Segment>) => void; play: (t: number) => void; onExport: (k: 'srt' | 'txt') => void;
}) {
  const { segs, bad, edit, patch, play } = props;
  const [find, setFind] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const caret = useRef<Record<number, number>>({});
  const words = useMemo(() => segs.reduce((n, s) => n + s.text.replace(/\s/g, '').length, 0), [segs]);

  return (
    <section className="k-panel os-editor">
      <div className="os-bar">
        <b>字幕 <span className="k-num">{segs.length}</span> 条</b>
        <span className="k-muted k-num">约 {words} 字</span>
        <span className="os-sp" />
        <span className="os-find">
          <Search size={14} aria-hidden />
          <input className="k-input" aria-label="查找" placeholder="查找" value={find} onChange={(e) => { setFind(e.target.value); setNote(''); }} />
          <input className="k-input" aria-label="替换为" placeholder="替换为" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="k-btn os-sm" disabled={!find} onClick={() => { const r = replaceAll(segs, find, to); if (r.count) edit(r.segs); setNote(r.count ? `已替换 ${r.count} 处` : '没有找到'); }}>全部替换</button>
          {note && <span className="k-muted" role="status">{note}</span>}
        </span>
        <button className="k-btn" onClick={() => props.onExport('txt')}>导出文本 TXT</button>
        <button className="k-btn primary" onClick={() => props.onExport('srt')}>导出字幕 SRT</button>
      </div>
      {props.issues > 0 && <div className="os-msg err" role="alert"><AlertTriangle size={14} aria-hidden /> 有 {props.issues} 处时间或文字问题（已在下面标红），导出前建议改一下。</div>}
      {!isPreview && <audio ref={props.audioRef} className="os-audio" controls preload="none" src={isPreview ? undefined : fileSrc(props.file)} aria-label="原声试听" />}
      <ol className="os-list">
        {segs.map((s, i) => (
          <li key={i} className={`os-row${bad.has(i) ? ' bad' : ''}`}>
            <span className="os-idx k-num">{i + 1}</span>
            <div className="os-times">
              <TimeInput label={`第 ${i + 1} 条开始时间`} value={s.start} onCommit={(v) => patch(i, { start: v })} />
              <TimeInput label={`第 ${i + 1} 条结束时间`} value={s.end} onCommit={(v) => patch(i, { end: v })} />
            </div>
            <textarea className="k-textarea os-text" rows={Math.max(1, Math.ceil(s.text.length / 28))} aria-label={`第 ${i + 1} 条字幕文字`} value={s.text}
              onChange={(e) => patch(i, { text: e.target.value })} onSelect={(e) => { caret.current[i] = e.currentTarget.selectionStart; }} />
            <div className="os-acts">
              <button className="k-icon-btn" title="从这里试听" aria-label={`试听第 ${i + 1} 条`} onClick={() => play(s.start)}><Play size={14} /></button>
              <button className="k-icon-btn" title="在光标处拆成两条" aria-label={`拆分第 ${i + 1} 条`} onClick={() => edit(splitAt(segs, i, caret.current[i] ?? 0))}><Scissors size={14} /></button>
              <button className="k-icon-btn" title="与下一条合并" aria-label={`第 ${i + 1} 条与下一条合并`} disabled={i === segs.length - 1} onClick={() => edit(mergeNext(segs, i))}><GitMerge size={14} /></button>
              <button className="k-icon-btn" title="删除这一条" aria-label={`删除第 ${i + 1} 条`} onClick={() => edit(removeAt(segs, i))}><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TimeInput({ value, onCommit, label }: { value: number; onCommit: (v: number) => void; label: string }) {
  const [text, setText] = useState(shortTime(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(shortTime(value)); setInvalid(false); }, [value]);
  const commit = () => {
    const v = parseTime(text);
    if (v == null) { setInvalid(true); return; }
    setInvalid(false);
    if (Math.abs(v - value) > 0.0005) onCommit(v);
    else setText(shortTime(value));
  };
  return <input className={`k-input os-time k-num${invalid ? ' invalid' : ''}`} aria-label={label} aria-invalid={invalid} value={text} title={invalid ? '时间写法不对，例如 1:02.5' : '格式 分:秒.毫秒，例如 1:02.5'}
    onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />;
}

