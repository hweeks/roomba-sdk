'use strict';

import mqtt from 'mqtt'
import { iRobotState } from "../roomba-state";

export type iRobotPacketv2 = mqtt.Packet & {
  payload?: any
}

export interface ApiCommandv2 {
  command?: any;
  time?: number;
  initiator?: string;
  state?: any;
}

export default function localV2 (user: string, password: string, host: string, emitIntervalTime: number) {
  if (!user) throw new Error('robotID is required.');
  if (!password) throw new Error('password is required.');
  if (!host) throw new Error('host is required.');

  const posibleCap = ['pose', 'ota', 'multiPass', 'carpetBoost', 'pp', 'binFullDetect', 'langOta', 'maps', 'edge', 'eco', 'svcConf'];
  emitIntervalTime = emitIntervalTime || 800;
  let robotStatev2 : Partial<iRobotState> = {};
  let cap: any | null = null;
  let missionInterval: null | NodeJS.Timer;

  const url = 'tls://' + host;

  var options = {
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

  const client = mqtt.connect(url, options);

  client.on('error', function (e) {
    throw e;
  });

  client.on('connect', function () {
    missionInterval = setInterval(() => {
      if (robotStatev2.cleanMissionStatus) {
        client.emit('mission', filterProps(['cleanMissionStatus', 'pose', 'bin']));
      }
    }, emitIntervalTime);
  });

  client.on('close', function () {
    if (missionInterval) {
      clearInterval(missionInterval);
    }
  });

  client.on('packetreceive', function (packet: iRobotPacketv2) {
    if (packet.payload) {
      try {
        const msg = JSON.parse(packet.payload.toString());
        robotStatev2 = Object.assign(robotStatev2, msg.state.reported);
        client.emit('update', msg);
        client.emit('state', robotStatev2);
        if (robotStatev2.cap) {
          cap = {};
          cap = Object.assign(cap, robotStatev2.cap);
        }
      } catch (e) {}
    }
  });

  function _apiCall (topic: string, command: string | {[key: string]: any}, additionalArgs?: any) {
    return new Promise((resolve, reject) => {
      let cmd : ApiCommandv2 = {command: command, time: Date.now() / 1000 | 0, initiator: 'localApp'};
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

  function hasAllProps (obj: any, properties: any) {
    for (var p in properties) {
      if (posibleCap.indexOf(properties[p]) > -1 && cap && Object.keys(cap).indexOf(properties[p]) === -1) {
        obj[properties[p]] = undefined; // asking for a non available capability, just set to undefined
      }
      if (!obj.hasOwnProperty(properties[p])) {
        return false;
      }
    }
    return true;
  }

  function filterProps (properties:  {[key: string]: any}) {
    let ret : {[key: string]: any} = {};
    if (properties.length === 1) return robotStatev2[properties['0']];
    for (var p in properties) {
      ret[properties[p]] = robotStatev2[properties[p]];
    }
    return ret;
  }

  function waitPreferences (decode: any, waitFor: {[key: string]: any}, returnOnlyThat: boolean) {
    const builtWaitFor = (typeof waitFor === 'string') ? {'0': waitFor} : waitFor;
    return new Promise((resolve) => {
      var checkInterval = setInterval(() => {
        if (hasAllProps(robotStatev2, waitFor)) {
          clearInterval(checkInterval);
          resolve(returnOnlyThat ? filterProps(builtWaitFor) : robotStatev2);
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
    getRobotStatev2: (fields: {[key: string]: any}) => waitPreferences(false, fields, false),
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
};
