// 工具声明：离线视频转字幕（自定义界面；语音识别在本机完成，不调用大模型）。
import { Captions } from 'lucide-react';
import { createElement } from 'react';
import type { CustomTool } from '../kit/types';
import { Main } from './Main';

const tool: CustomTool = {
  id: 'c06',
  name: '离线视频转字幕',
  tagline: '导入视频或音频，在本机离线识别中文或英文，生成带时间轴的字幕，逐条修改后导出 SRT / TXT。不联网、不用显卡，仅首次使用需要下载识别模型。',
  icon: Captions,
  category: '内容生产',
  type: 'media',
  mode: 'custom',
  mainLabel: '转字幕',
  params: [],
  Main: ({ ctx }) => createElement(Main, { ctx }),
};

export default tool;
