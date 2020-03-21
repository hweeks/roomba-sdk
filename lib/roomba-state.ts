export interface iRobotState {
  [key: string]: any
  netinfo:{
    dhcp: boolean,
    addr: number,
    mask: number,
    gw: number,
    dns1: number,
    dns2: number,
    bssid: string,
    sec: number
  },
  wifistat: {
    wifi: number,
    uap: boolean,
    cloud: number
  },
  wlcfg: {
    sec: number,
    ssid: string
  },
  mac: string,
  country: string,
  cloudEnv: string,
  svcEndpoints: {
    svcDeplId: string
  },
  localtimeoffset: number,
  utctime: number,
  pose: {
    theta: number,
    point: {
      x: number,
      y: number
    }
  },
  batPct: number,
  dock: {
    known: boolean
  },
  bin: {
    present: boolean, full: boolean
  },
  audio: {
    active: boolean
  },
  cleanMissionStatus:{
    cycle: string,
    phase: string,
    expireM: number,
    rechrgM: number,
    error: number,
    notReady: number,
    mssnM: number,
    sqft: number,
    initiator: string,
    nMssn: number
  },
  language: number,
  noAutoPasses: boolean,
  noPP: boolean,
  ecoCharge: boolean,
  vacHigh: boolean,
  binPause: boolean,
  carpetBoost: boolean,
  openOnly: boolean,
  twoPass: boolean,
  schedHold: boolean,
  lastCommand: {
    command: string,
    time: number,
    initiator: string
  },
  langs:{ [key: string]: number }[],
  bbnav: {
    aMtrack: number,
    nGoodLmrks: number,
    aGain: number,
    aExpo: number
  },
  bbpanic: { panics: number[] },
  bbpause: { pauses: number[] },
  bbmssn: {
    nMssn: number,
    nMssnOk: number,
    nMssnC: number,
    nMssnF: number,
    aMssnM: number,
    aCycleM: number
  },
  bbrstinfo: {
    nNavRst: number,
    nMobRst: number,
    causes: string
  },
  cap: {
    pose: number,
    ota: number,
    multiPass: number,
    carpetBoost: number
  },
  sku: string,
  batteryType: string,
  soundVer: string,
  uiSwVer: string,
  navSwVer: string,
  wifiSwVer: string,
  mobilityVer: string,
  bootloaderVer: string,
  umiVer: string,
  softwareVer: string,
  tz:{
    events: { dt: number, off: number }[],
    ver: number
  },
  timezone: string,
  name: string,
  cleanSchedule: {
    cycle: string[],
    h: number[],
    m: number[]
  },
  bbchg3:{
    avgMin: number,
    hOnDock: number,
    nAvail: number,
    estCap: number,
    nLithChrg: number,
    nNimhChrg: number,
    nDocks: number
  },
  bbchg: {
    nChgOk: number,
    nLithF: number,
    aborts: number[]
  },
  bbswitch: {
    nBumper: number,
    nClean: number,
    nSpot: number,
    nDock: number,
    nDrops: number
  },
  bbrun:{
    hr: number,
    min: number,
    sqft: number,
    nStuck: number,
    nScrubs: number,
    nPicks: number,
    nPanics: number,
    nCliffsF: number,
    nCliffsR: number,
    nMBStll: number,
    nWStll: number,
    nCBump: number
  },
  bbsys: {
    hr: number,
    min: number
  },
  signal: {
    rssi: number, snr: number
  }
}
