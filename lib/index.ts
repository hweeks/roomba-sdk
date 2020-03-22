'use strict';
import cloudV1 from './v1/cloud'
import cloudV2 from './v2/cloud'

import localV1 from './v1/local'
import localV2 from './v2/local'

import * as discoveryRoot from './discovery'

export function cloud (username: string, password: string, version?: number) {
  if (version === 1) return cloudV1(username, password);
  return cloudV2(username, password);
}

export function local (username: string, password: string, ip: string, version?: number, interval?: number) {
  if (version === 1) return localV1(username, password, ip);
  return localV2(username, password, ip, interval);
}

const getRobotIP = discoveryRoot.discovery

const getRobotPublicInfo = discoveryRoot.getRobotPublicInfo

const discoveryWithCallback = (cb: any) => discoveryRoot.discovery(cb, true)

export {
  cloud as Cloud,
  local as Local,
  getRobotIP,
  discoveryWithCallback as discovery,
  getRobotPublicInfo
};
