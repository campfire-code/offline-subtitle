// 预览与截图用的示例字幕（内容为自编示例，不含真实人名或新闻）。
import type { Segment } from './asr';

export const DEMO_NAME = '示例-整理房间小课堂.mp4';

export const DEMO_SEGMENTS: Segment[] = [
  { start: 0.0, end: 3.2, text: '大家好，欢迎来到周末整理小课堂。（示例）' },
  { start: 3.2, end: 7.5, text: '今天我们来聊一聊，怎么用一个下午把房间收拾利落。' },
  { start: 7.5, end: 11.1, text: '第一步，把用不到的东西分成三类：留下、送人、丢掉。' },
  { start: 11.1, end: 15.8, text: '第二步，给留下的东西找一个固定的位置，用完就放回去。' },
  { start: 15.8, end: 19.4, text: '第三步，每天花十分钟，把桌面清空一次。' },
  { start: 19.4, end: 23.9, text: '坚持一个星期，你会发现房间真的不一样了。' },
  { start: 23.9, end: 27.0, text: '好，我们先从书桌开始吧。' },
  { start: 27.0, end: 31.6, text: '先把桌上所有的东西都拿下来，擦一遍桌面。' },
  { start: 31.6, end: 36.2, text: '然后一样一样往回放，常用的放在手边。' },
];
