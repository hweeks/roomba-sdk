/* global it describe */
'use strict';

const chai = require('chai');
const expect = chai.expect;
const iRobotSDK = require('../lib/index');

describe('iRobotSDK require', () => {
  it('should return an object with functions', () => {
    expect(iRobotSDK).to.be.instanceof(Object);
    expect(iRobotSDK).to.have.property('Cloud');
    expect(iRobotSDK).to.have.property('Local');
    expect(iRobotSDK).to.have.property('getRobotIP');
    expect(iRobotSDK.Cloud).to.be.instanceof(Function);
    expect(iRobotSDK.Local).to.be.instanceof(Function);
    expect(iRobotSDK.getRobotIP).to.be.instanceof(Function);
  });
});
