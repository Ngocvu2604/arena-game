export const actions = ['left','right','up','crouch','light','jump','dash','skill','ultimate'] as const
export type Action = typeof actions[number]
export type Difficulty = 'Easy' | 'Normal' | 'Hard'
export type Quality = 'Auto' | 'Low' | 'Medium' | 'High'
export type Mode = 'cpu' | 'versus' | 'training'
export interface Match { mode: Mode; fighters: [number, number]; stage: number; difficulty: Difficulty }
export interface Settings {
  version: 3
  master: number; music: number; effects: number; mute: boolean
  pixel: boolean; shake: number; particles: number; performance: boolean
  quality: Quality; resolution: number; fpsLimit: number; showFps: boolean
  background: boolean; specialEffects: number; introDuration: number
  duration: number; rounds: number; difficulty: Difficulty; combo: boolean; hints: boolean
  language: 'English' | 'Vietnamese'
  keys: [string[], string[]]
}
const storageKey = 'pixel-fantasy-arena/settings-v1'
export const reserved = ['Escape','Enter','Backspace','Tab','F1','F2','F3','F4','F5','F11','MetaLeft','MetaRight','AltLeft','AltRight','ControlLeft','ControlRight','ShiftLeft','ShiftRight']
export const compactPlayer2 = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Digit4','Digit5']
export function defaults(): Settings {
  return {version:3,master:75,music:45,effects:75,mute:false,pixel:true,shake:55,particles:70,performance:false,
    quality:'Auto',resolution:1,fpsLimit:60,showFps:false,background:true,specialEffects:70,introDuration:1500,
    duration:90,rounds:3,difficulty:'Normal',combo:true,hints:false,language:'English',
    keys:[['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU','KeyI'],
      ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5']] }
}
export function validKeys(keys: unknown): keys is [string[],string[]] {
  if(!Array.isArray(keys)||keys.length!==2||!keys.every(row=>Array.isArray(row)&&row.length===actions.length))return false
  const flat=keys.flat()
  return new Set(flat).size===actions.length*2&&flat.every(code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Space|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote)$/.test(code)&&!reserved.includes(code))
}
export function parseSettings(raw: string | null): Settings {
  const value = defaults()
  try {
    const saved = JSON.parse(raw ?? '{}')
    for (const key of ['master','music','effects','shake','particles','specialEffects'] as const)
      if (Number.isFinite(saved[key])) value[key] = Math.min(100, Math.max(0, saved[key]))
    for (const key of ['mute','pixel','performance','combo','hints','showFps','background'] as const)
      if (typeof saved[key] === 'boolean') value[key] = saved[key]
    if ([30,60,90,120].includes(saved.duration)) value.duration = saved.duration
    if ([1,3,5].includes(saved.rounds)) value.rounds = saved.rounds
    if (['Easy','Normal','Hard'].includes(saved.difficulty)) value.difficulty = saved.difficulty
    if (['Auto','Low','Medium','High'].includes(saved.quality)) value.quality=saved.quality
    if ([0.5,0.75,1,1.5].includes(saved.resolution)) value.resolution=saved.resolution
    if ([0,30,60,120].includes(saved.fpsLimit)) value.fpsLimit=saved.fpsLimit
    if ([900,1500,2200].includes(saved.introDuration)) value.introDuration=saved.introDuration
    if (saved.language === 'Vietnamese') value.language = saved.language
    if (saved.version===3 && validKeys(saved.keys)) value.keys=saved.keys
  } catch { /* Invalid storage uses validated defaults. */ }
  return value
}
export function loadSettings(): Settings {
  try { return parseSettings(localStorage.getItem(storageKey)) } catch { return defaults() }
}
export const options = { current: loadSettings() }
export function saveSettings(settings: Settings): boolean {
  options.current = settings
  try { localStorage.setItem(storageKey, JSON.stringify(settings)); return true } catch { return false }
}
export function keyName(code: string): string {
  return code.replace(/^Key|^Digit/,'').replace(/^Arrow/,'').replace(/^Numpad/,'Num ')
}

