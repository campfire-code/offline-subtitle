# 离线视频转字幕

> 篝火出品 · 收录于篝火 App 应用区

不联网、不用显卡，Mac 和 Windows 都能跑

![界面截图](docs/screenshot.png)

## 下载

到 [Releases](https://github.com/campfire-code/offline-subtitle/releases/latest) 下载对应安装包：

| 电脑 | 文件 |
|---|---|
| Windows 10 / 11 | `offline-subtitle_版本号_windows-x64-setup.exe` |
| Mac（Apple 芯片） | `offline-subtitle_版本号_mac-arm64.dmg` |
| Mac（Intel 芯片） | `offline-subtitle_版本号_mac-x64.dmg` |

第一次打开：
- **Windows**：如果弹出「Windows 已保护你的电脑」，点「更多信息」→「仍要运行」。
- **Mac**：如果提示「无法验证开发者」，打开「系统设置 → 隐私与安全性」，在下方点「仍要打开」。

## 怎么用

1. 把视频或音频拖进窗口（或点「选择文件…」）。支持 mp4、mov、mkv、avi、flv、webm、mp3、wav、m4a、aac、flac 等，文件不会上传。
2. 选「识别语言」（中文 / English，不支持自动判断语言）和「识别模型」。推荐 small：更准，约 240 MB；base 约 76 MB、更快，但错字和漏句明显更多。
3. 点「开始识别」。第一次使用会下载识别模型并校验（SHA-256），之后完全离线。下载不了时，自己下载模型文件后点「指定本地模型文件夹…」选择（文件夹里的目录结构要和下载版一致，缺文件或校验不过会提示具体是哪一个）。
4. 识别按 30 秒一段进行，并尽量在停顿处断开。完成后在列表里逐条修改：改文字、改起止时间（写法如 `1:02.5`）、「在光标处拆分」、「与下一条合并」、删除；也可用「查找 / 替换」批量改同一个错别字；点 ▶ 可从该条开始试听原声。
5. 点「导出字幕 SRT」或「导出文本 TXT」。导出文件为带 BOM 的 UTF-8，Windows 自带播放器和旧软件也不乱码。

说明：
- 中文默认统一成简体并把标点改成全角，可在选项里关掉。
- 识别在本机用 CPU 运行，不需要显卡。小模型的速度约为音频时长的 0.6 倍（在一台 Apple 芯片 Mac 的 Chrome 里实测 41 秒音频用了约 25 秒），长视频请留足时间。
- 整段音频会先转成 16kHz 单声道放进内存（每小时约 230 MB），建议单个文件不超过 2 小时。
- 背景音乐很吵、多人抢话、方言、专业术语较多时准确率会下降，请以人工校对为准。

## 验收用例

以下文件在 `samples/` 里，均由 macOS 自带语音合成，内容为自编示例：

| 用例 | 操作 | 应得到的结果 |
|---|---|---|
| 中文视频 | 拖入 `示例-整理房间.mp4`，语言选「中文」，模型选 small，点「开始识别」 | 约 25 秒后出现约 7–9 条字幕，覆盖「欢迎来到周末整理小课堂」到「常用的放在手边」；第一条从 0:00 开始，最后一条结束于 0:41 左右；字幕为简体、行尾没有逗号 |
| 长音频分段 | 同上，观察进度文字 | 显示「第 1 / 2 段」「第 2 / 2 段」（41 秒音频分为两段）；第二段的字幕时间都晚于 0:29，没有回到 0 秒重新计时 |
| 英文音频 | 拖入 `sample-english.wav`，语言选 English | 得到 3 句英文字幕，如 “Hello everyone, welcome to today's show.”，没有把单词从中间切断 |
| 修改与合并 | 在结果里把「小客堂」改成「小课堂」；对第 1 条点「与下一条合并」 | 文字立即更新；合并后条数减 1，合并条的起止时间覆盖原来两条 |
| 导出 | 点「导出字幕 SRT」，保存后用文本编辑器打开 | 序号从 1 递增，时间形如 `00:00:03,800 --> 00:00:08,960`，条数与界面一致；再点「导出文本 TXT」得到一行一条的纯文本 |
| 断网与模型文件夹 | 模型下载完成后断开网络，重新识别 | 正常出结果，不再下载；选「指定本地模型文件夹」并选一个缺文件的文件夹，提示「缺少 onnx/…」 |
| 取消 | 识别中点「取消」 | 立即停止，显示「已取消」，已有字幕不被清空 |

## 自己编译

需要 Node.js 22、pnpm、Rust。

```bash
pnpm install
pnpm test          # 单元测试
pnpm tauri dev     # 开发运行
pnpm tauri build   # 打包
```

界面框架在 `src/kit`（所有 campfire-code 工具共用），本工具的逻辑在 `src/tool`。

## 致谢

本工具使用 [OpenAI Whisper](https://github.com/openai/whisper)（MIT）的模型权重，经 [transformers.js](https://github.com/huggingface/transformers.js)（Apache-2.0）转换版本在 onnxruntime-web 里运行；繁简转换使用 [opencc-js](https://github.com/nk2028/opencc-js)。音视频处理使用随应用附带的 FFmpeg。完整清单见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

## 归属

本工具由**篝火**出品，是篝火 App 应用区收录的开源工具之一，由篝火（GitHub 组织 [campfire-code](https://github.com/campfire-code)）维护与更新。全部工具的目录见 [toolkit-hub](https://github.com/campfire-code/toolkit-hub)。

## 许可证

MIT，版权方为篝火（campfire-code）。
