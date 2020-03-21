'use strict';

import request from 'request-promise';

interface iRobotRequest {
  method: string;
  uri: string;
  strictSSL: boolean;
  headers: {
    'Content-Type': string;
    Connection: string;
    'User-Agent': string;
    'Content-Encoding': string;
    Authorization: string;
    Accept: string;
    'Accept-Language': string;
    Host: string;
  };
  body?: any
}

export default function localV1 (user: string, password: string, host: string) {
  if (!user) throw new Error('robotID is required.');
  if (!password) throw new Error('password is required.');
  if (!host) throw new Error('host is required.');

  let rid = 0;

  const requestOptions : iRobotRequest = {
    'method': 'POST',
    'uri': 'https://' + host + ':443/umi',
    'strictSSL': false,
    'headers': {
      'Content-Type': 'application/json',
      'Connection': 'close',
      'User-Agent': 'aspen%20production/2618 CFNetwork/758.3.15 Darwin/15.4.0',
      'Content-Encoding': 'identity',
      'Authorization': 'Basic ' + new Buffer('user:' + password).toString('base64'),
      'Accept': '*/*',
      'Accept-Language': 'en-us',
      'Host': host
    }
  };

  function _apiCall (method: string, command: string, args?: any) {
    rid++;
    if (rid > 1000) rid = 1;

    requestOptions.body = '{"do":"' + method + '","args":["' + command + '"' + (args ? ', ' + JSON.stringify(args) : '') + '],"id":' + rid + '}';

    return request(requestOptions).then(JSON.parse);
  }

  function _setPreferences (and: any, or?: any) {
    return _apiCall('get', 'prefs').then(function (resp) {
      if (and) resp.ok.flags = resp.ok.flags & and;
      if (or) resp.ok.flags = resp.ok.flags | or;
      return _apiCall('set', 'prefs', resp.ok);
    });
  }

  function _getPreferences (decode: boolean) {
    if (decode === false) return _apiCall('get', 'prefs');
    return _apiCall('get', 'prefs').then(function (resp) {
      if ('ok' in resp) resp.ok.cleaningPreferences = decodeCleaningPreferences(resp.ok.flags);
      return resp;
    });
  }

  function _getMission (decode: boolean) {
    if (decode === false) return _apiCall('get', 'mssn');
    let notReadMsgs: {[key: number]: any} = {
      0: 'Ready',
      1: 'Near a cliff',
      2: 'Both wheels dropped',
      3: 'Left wheel dropped',
      4: 'Right wheel dropped',
      7: 'Bin missing'
    };

    return _apiCall('get', 'mssn').then(function (resp) {
      if ('ok' in resp) resp.ok.missionFlags = decodeMissionFlags(resp.ok.flags);
      if ('ok' in resp) resp.ok.notReadyMsg = notReadMsgs[resp.ok.notReady] || 'Unknown';
      return resp;
    });
  }

  function decodeMissionFlags (flags: any) {
    return {
      idle: !(flags & 4),
      binFull: Boolean(flags & 1),
      binRemoved: Boolean(flags & 2),
      beeping: Boolean(flags & 8)
    };
  }

  function decodeCleaningPreferences (flags: any) {
    const carpetBoostOptions : {[key: string]: any} = {
      '0': 'auto',
      '16': 'eco',
      '80': 'performance'
    };
    const cleaningPasses : {[key: string]: any} = {
      '0': 'auto',
      '1024': '1',
      '1025': '2'
    };
    return {
      carpetBoost: carpetBoostOptions[(flags & 80)],
      edgeClean: !(flags & 2),
      cleaningPasses: cleaningPasses[(flags & 1025)],
      alwaysFinish: !(flags & 32)
    };
  }

  return {
    decodeCleaningPreferences: decodeCleaningPreferences,
    getTime: () => _apiCall('get', 'time'),
    getBbrun: () => _apiCall('get', 'bbrun'),
    getLangs: () => _apiCall('get', 'langs'),
    getSys: () => _apiCall('get', 'sys'),
    getWirelessLastStatus: () => _apiCall('get', 'wllaststat'),
    getWeek: () => _apiCall('get', 'week'),
    getPreferences: (decode: boolean) => _getPreferences(decode),
    getMission: (decode: boolean) => _getMission(decode),
    getWirelessConfig: () => _apiCall('get', 'wlcfg'),
    getWirelessStatus: () => _apiCall('get', 'wlstat'),
    getCloudConfig: () => _apiCall('get', 'cloudcfg'),
    getSKU: () => _apiCall('get', 'sku'),
    start: () => _apiCall('set', 'cmd', {'op': 'start'}),
    pause: () => _apiCall('set', 'cmd', {'op': 'pause'}),
    stop: () => _apiCall('set', 'cmd', {'op': 'stop'}),
    resume: () => _apiCall('set', 'cmd', {'op': 'resume'}),
    dock: () => _apiCall('set', 'cmd', {'op': 'dock'}),
    setWeek: (args: any) => _apiCall('set', 'week', args),
    setTime: (args: any) => _apiCall('set', 'time', args),
    setPtime: (args: any) => _apiCall('set', 'ptime', args),
    setPreferences: (args: any) => _apiCall('set', 'prefs', args),
    setCarpetBoostAuto: () => _setPreferences(65455),
    setCarpetBoostPerformance: () => _setPreferences(null, 80),
    setCarpetBoostEco: () => _setPreferences(65471, 16),
    setEdgeCleanOn: () => _setPreferences(65533),
    setEdgeCleanOff: () => _setPreferences(null, 2),
    setCleaningPassesAuto: () => _setPreferences(64510),
    setCleaningPassesOne: () => _setPreferences(65534, 1024),
    setCleaningPassesTwo: () => _setPreferences(null, 1025),
    setAlwaysFinishOn: () => _setPreferences(65503),
    setAlwaysFinishOff: () => _setPreferences(null, 32)
  };
};
