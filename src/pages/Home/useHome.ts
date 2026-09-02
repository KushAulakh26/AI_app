import { useState } from "react"

export interface NavLinkItem {
  label: string
  to: string
}

export interface FeatureItem {
  key: string
  title: string
  desc: string
  to: string
  tag?: string
  bullets?: string[]
}

export interface CaseItem {
  key: string
  kind: string
  title: string
  note: string
  gradient: string
  rotate?: string
}

export interface HeroStat {
  value: string
  label: string
}

const NAV_LINKS: NavLinkItem[] = [
  { label: "模特圖", to: "/model-gen" },
  { label: "商品圖", to: "/scene" },
  { label: "文案", to: "/copywriting" },
  { label: "視頻", to: "/video" },
  { label: "我的作品", to: "/works" },
  { label: "模型設置", to: "/settings" },
]

const HERO_STATS: HeroStat[] = [ // Static marketing highlights (replace with real metrics when available)
  { value: "6 項", label: "內容能力一站齊" },
  { value: "1 張圖", label: "商品圖就能起步" },
  { value: "秒級", label: "出稿節奏不用等" },
]

const FEATURES: FeatureItem[] = [
  {
    key: "model",
    title: "AI 模特圖",
    desc: "上傳服裝平鋪圖，生成真人模特上身效果圖，免約拍、免棚拍，主圖直接可用。",
    to: "/model-gen",
    tag: "主推",
    bullets: ["多種模特形象可選", "姿勢與背景隨手換", "電商主圖直接出"],
  },
  {
    key: "scene",
    title: "商品場景圖",
    desc: "把商品放進生活化場景，氛圍感背景一步到位，詳情頁與社媒圖都好用。",
    to: "/scene",
  },
  {
    key: "copy",
    title: "營銷文案",
    desc: "圍繞賣點生成標題、種草文案與促銷話術，上架推廣一次備齊。",
    to: "/copywriting",
  },
  {
    key: "detail",
    title: "商品詳情頁",
    desc: "按賣點組織排版，生成可直接上架的詳情頁內容。",
    to: "/detail",
  },
  {
    key: "video",
    title: "短視頻腳本",
    desc: "分鏡、口播與字幕一次給出，照着腳本就能開拍。",
    to: "/video",
  },
]

const TOOL_ITEMS: string[] = ["去背景", "去水印", "高清修復"]

const CASES: CaseItem[] = [ // Static showcase examples (replace with real generated works when available)
  {
    key: "c1",
    kind: "場景圖",
    title: "香薰蠟燭 · 暖光桌面",
    note: "氛圍感場景主圖",
    gradient: "from-primary via-secondary to-accent",
  },
  {
    key: "c2",
    kind: "模特圖",
    title: "針織開衫 · 街景通勤",
    note: "模特上身效果圖",
    gradient: "from-secondary via-accent to-background",
    rotate: "rotate-1",
  },
  {
    key: "c3",
    kind: "詳情頁",
    title: "保溫杯 · 賣點長圖",
    note: "詳情頁排版示例",
    gradient: "from-accent via-secondary to-primary/60",
    rotate: "-rotate-1",
  },
  {
    key: "c4",
    kind: "短視頻",
    title: "帆布包 · 15 秒口播",
    note: "短視頻腳本示例",
    gradient: "from-secondary via-background to-accent",
  },
  {
    key: "c5",
    kind: "去背景",
    title: "帆布鞋 · 透明底摳圖",
    note: "一鍵摳出透明底商品",
    gradient: "from-primary/70 via-background to-secondary",
    rotate: "rotate-1",
  },
  {
    key: "c6",
    kind: "高清修復",
    title: "舊圖商品照 · 模糊變清晰",
    note: "畫質修復增強",
    gradient: "from-secondary via-primary/50 to-accent",
    rotate: "-rotate-1",
  },
  {
    key: "c7",
    kind: "營銷文案",
    title: "口紅 · 小紅書種草",
    note: "平台風格文案生成",
    gradient: "from-accent via-background to-primary/60",
  },
  {
    key: "c8",
    kind: "分鏡腳本",
    title: "水杯 · 三鏡快剪",
    note: "逐鏡腳本直接出片",
    gradient: "from-primary/60 via-accent to-secondary",
    rotate: "rotate-1",
  },
]

export function useHome() {
  const [splitPos, setSplitPos] = useState(58)

  const onSplitChange = (value: number) => {
    setSplitPos(Math.min(100, Math.max(0, value)))
  }

  const scrollToCases = () => {
    document.getElementById("cases")?.scrollIntoView({ behavior: "smooth" })
  }

  return {
    navLinks: NAV_LINKS,
    heroStats: HERO_STATS,
    features: FEATURES,
    toolItems: TOOL_ITEMS,
    cases: CASES,
    splitPos,
    onSplitChange,
    scrollToCases,
  }
}
