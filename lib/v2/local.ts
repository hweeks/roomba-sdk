'use strict';

import mqtt from 'mqtt'
import { RoombaState } from "../roomba-state";

export type iRobotPacketV2 = mqtt.Packet & {
  payload?: any;
}

export interface ApiCommandV2 {
  command?: any;
  time?: number;
  initiator?: string;
  state?: any;
}

type PrefReturn = Promise<RoombaState | Partial<RoombaState> | null>

export interface LocalV2Return extends mqtt.MqttClient {
  getTime: () => PrefReturn;
  getBbrun: () => PrefReturn;
  getLangs: () => PrefReturn;
  getSys: () => PrefReturn;
  getWirelessLastStatus: () => PrefReturn;
  getWeek: () => PrefReturn;
  getPreferences: (decode: () => void) => PrefReturn;
  getRobotState: (fields: {
      [key: string]: any;
  }) => PrefReturn;
  getMission: (decode: () => void) => PrefReturn;
  getBasicMission: (decode: () => void) => PrefReturn;
  getWirelessConfig: () => PrefReturn;
  getWirelessStatus: () => PrefReturn;
  getCloudConfig: () => PrefReturn;
  getSKU: () => PrefReturn;
  start: () => Promise<{ok: null}>;
  clean: () => Promise<{ok: null}>;
  cleanRoom: (args: any) => Promise<{ok: null}>;
  pause: () => Promise<{ok: null}>;
  stop: () => Promise<{ok: null}>;
  resume: () => Promise<{ok: null}>;
  dock: () => Promise<{ok: null}>;
  evac: () => Promise<{ok: null}>;
  train: () => Promise<{ok: null}>;
  setWeek: (args: any) => Promise<{ok: null}>;
  setPreferences: (args: any) => Promise<{ok: null}>;
  setCarpetBoostAuto: () => Promise<{ok: null}>;
  setCarpetBoostPerformance: () => Promise<{ok: null}>;
  setCarpetBoostEco: () => Promise<{ok: null}>;
  setEdgeCleanOn: () => Promise<{ok: null}>;
  setEdgeCleanOff: () => Promise<{ok: null}>;
  setCleaningPassesAuto: () => Promise<{ok: null}>;
  setCleaningPassesOne: () => Promise<{ok: null}>;
  setCleaningPassesTwo: () => Promise<{ok: null}>;
  setAlwaysFinishOn: () => Promise<{ok: null}>;
  setAlwaysFinishOff: () => Promise<{ok: null}>;
}

export default function localV2 (user: string, password: string, host: string, emitIntervalTime: number): LocalV2Return {
  if (!user) throw new Error('robotID is required.');
  if (!password) throw new Error('password is required.');
  if (!host) throw new Error('host is required.');

  const posibleCap = ['pose', 'ota', 'multiPass', 'carpetBoost', 'pp', 'binFullDetect', 'langOta', 'maps', 'edge', 'eco', 'svcConf'];
  emitIntervalTime = emitIntervalTime || 800;
  let robotState: Partial<RoombaState> = {};
  let cap: any | null = null;
  let missionInterval: null | NodeJS.Timer;

  const url = 'tls://' + host;

  const options = {
    port: 8883,
    clientId: user,
    rejectUnauthorized: false,
    protocolId: 'MQTT',
    protocolVersion: 4,
    ciphers: process.env.ROBOT_CIPHERS || 'AES128-SHA256',
    clean: false,
    username: user,
    password: password
  };

  function filterProps (properties:  {[key: string]: any}): Partial<RoombaState> | RoombaState {
    const ret: {[key: string]: any} = {};
    if (properties.length === 1) return robotState[properties['0']];
    for (const p in properties) {
      ret[properties[p]] = robotState[properties[p]];
    }
    return ret;
  }

  const client = mqtt.connect(url, options);

  client.on('error', function (e) {
    throw e;
  });

  client.on('connect', function () {
    missionInterval = setInterval(() => {
      if (robotState.cleanMissionStatus) {
        client.emit('mission', filterProps(['cleanMissionStatus', 'pose', 'bin']));
      }
    }, emitIntervalTime);
  });

  client.on('close', function () {
    if (missionInterval) {
      clearInterval(missionInterval);
    }
  });

  client.on('packetreceive', function (packet: iRobotPacketV2) {
    if (packet.payload) {
      try {
        const msg = JSON.parse(packet.payload.toString());
        robotState = Object.assign(robotState, msg.state.reported);
        client.emit('update', msg);
        client.emit('state', robotState);
        if (robotState.cap) {
          cap = {};
          cap = Object.assign(cap, robotState.cap);
        }
      } catch (e) {
        console.log('Error in packet response: ', e.message)
      }
    }
  });

  function _apiCall (topic: string, command: string | {[key: string]: any}, additionalArgs?: any): Promise<{ok: null}> {
    return new Promise((resolve, reject) => {
      let cmd: ApiCommandV2 = {command: command, time: Date.now() / 1000 | 0, initiator: 'localApp'};
      if (topic === 'delta') {
        cmd = {'state': command};
      }
      if (additionalArgs) {
        cmd = Object.assign(cmd, additionalArgs);
      }
      client.publish(topic, JSON.stringify(cmd), function (e) {
        if (e) return reject(e);
        resolve({ok: null}); // for retro compatibility
      });
    });
  }

  function hasAllProps (obj: any, properties: any): boolean {
    for (const p in properties) {
      if (posibleCap.indexOf(properties[p]) > -1 && cap && Object.keys(cap).indexOf(properties[p]) === -1) {
        obj[properties[p]] = undefined; // asking for a non available capability, just set to undefined
      }
      if (!obj.hasOwnProperty(properties[p])) { // eslint-disable-line no-prototype-builtins
        return false;
      }
    }
    return true;
  }

  function waitPreferences (decode: any, waitFor: {[key: string]: any}, returnOnlyThat: boolean): PrefReturn {
    const builtWaitFor = (typeof waitFor === 'string') ? {'0': waitFor} : waitFor;
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (hasAllProps(robotState, waitFor)) {
          clearInterval(checkInterval);
          resolve(returnOnlyThat ? filterProps(builtWaitFor) : robotState);
        }
      }, 100);
    });
  }

  return Object.assign(client, {
    getTime: () => waitPreferences(false, ['utctime'], true),
    getBbrun: () => waitPreferences(false, ['bbrun'], true),
    getLangs: () => waitPreferences(false, ['langs'], true),
    getSys: () => waitPreferences(false, ['bbrstinfo', 'cap', 'sku', 'batteryType', 'soundVer', 'uiSwVer', 'navSwVer', 'wifiSwVer', 'mobilityVer', 'bootloaderVer', 'umiVer', 'softwareVer', 'audio', 'bin'], true),
    getWirelessLastStatus: () => waitPreferences(false, ['wifistat', 'wlcfg'], true),
    getWeek: () => waitPreferences(false, ['cleanSchedule'], true),
    getPreferences: (decode: () => void) => waitPreferences(decode, ['cleanMissionStatus', 'cleanSchedule', 'name', 'vacHigh', 'signal'], false),
    getRobotState: (fields: {[key: string]: any}) => waitPreferences(false, fields, false),
    getMission: (decode: () => void) => waitPreferences(decode, ['cleanMissionStatus', 'pose', 'bin', 'batPct'], true),
    getBasicMission: (decode: () => void) => waitPreferences(decode, ['cleanMissionStatus', 'bin', 'batPct'], true),
    getWirelessConfig: () => waitPreferences(false, ['wlcfg', 'netinfo'], true),
    getWirelessStatus: () => waitPreferences(false, ['wifistat', 'netinfo'], true),
    getCloudConfig: () => waitPreferences(false, ['cloudEnv'], true),
    getSKU: () => waitPreferences(false, ['sku'], true),
    start: () => _apiCall('cmd', 'start'),
    clean: () => _apiCall('cmd', 'clean'),
    cleanRoom: (args: any) => _apiCall('cmd', 'start', args),
    pause: () => _apiCall('cmd', 'pause'),
    stop: () => _apiCall('cmd', 'stop'),
    resume: () => _apiCall('cmd', 'resume'),
    dock: () => _apiCall('cmd', 'dock'),
    evac: () => _apiCall('cmd', 'evac'),
    train: () => _apiCall('cmd', 'train'),
    setWeek: (args: any) => _apiCall('delta', {'cleanSchedule': args}),
    setPreferences: (args: any) => _apiCall('delta', args),
    setCarpetBoostAuto: () => _apiCall('delta', {'carpetBoost': true, 'vacHigh': false}),
    setCarpetBoostPerformance: () => _apiCall('delta', {'carpetBoost': false, 'vacHigh': true}),
    setCarpetBoostEco: () => _apiCall('delta', {'carpetBoost': false, 'vacHigh': false}),
    setEdgeCleanOn: () => _apiCall('delta', {'openOnly': false}),
    setEdgeCleanOff: () => _apiCall('delta', {'openOnly': true}),
    setCleaningPassesAuto: () => _apiCall('delta', {'noAutoPasses': false, twoPass: false}),
    setCleaningPassesOne: () => _apiCall('delta', {'noAutoPasses': true, twoPass: false}),
    setCleaningPassesTwo: () => _apiCall('delta', {'noAutoPasses': true, twoPass: true}),
    setAlwaysFinishOn: () => _apiCall('delta', {'binPause': false}),
    setAlwaysFinishOff: () => _apiCall('delta', {'binPause': true})
  });
}
