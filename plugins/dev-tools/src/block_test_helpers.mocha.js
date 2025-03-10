/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {assert} from 'chai';
import * as sinon from 'sinon';
import * as commonTestHelpers from './common_test_helpers.mocha';
import * as Blockly from 'blockly/core';

const {
  runTestCases,
  runTestSuites,
  TestCase,
  TestSuite,
} = commonTestHelpers;

/**
 * Code generation test case configuration.
 * @implements {TestCase}
 * @record
 */
export class CodeGenerationTestCase {
  /**
   * Class for a code generation test case.
   */
  constructor() {
    /**
     * @type {string} The expected code.
     */
    this.expectedCode;
    /**
     * @type {boolean|undefined} Whether to use workspaceToCode instead of
     * blockToCode for test.
     */
    this.useWorkspaceToCode;
    /**
     * @type {number|undefined} The expected inner order.
     */
    this.expectedInnerOrder;
  }

  /**
   * Creates the block to use for this test case.
   * @param {!Blockly.Workspace} workspace The workspace context for this
   *    test.
   * @return {!Blockly.Block} The block to use for the test case.
   */
  createBlock(workspace) {}
}

/**
 * Code generation test suite.
 * @extends {TestSuite<CodeGenerationTestCase, CodeGenerationTestSuite>}
 * @record
 */
export class CodeGenerationTestSuite {
  /**
   * Class for a code generation test suite.
   */
  constructor() {
    /**
     * @type {!Blockly.Generator} The generator to use for running test cases.
     */
    this.generator;
  }
}

/**
 * Serialization test case.
 * @implements {TestCase}
 * @record
 */
export class SerializationTestCase {
  /**
   * Class for a block serialization test case.
   */
  constructor() {
    /**
     * @type {string} The block xml to use for test.
     */
    this.xml;
    /**
     * @type {string|undefined} The expected xml after round trip. Provided if
     *    it different from xml that was passed in.
     */
    this.expectedXml;
  }
  /**
   * Asserts that the block created from xml has the expected structure.
   * @param {!Blockly.Block} block The block to check.
   */
  assertBlockStructure(block) {}
}

/**
 * Returns mocha test callback for code generation based on provided
 *    generator.
 * @param {!Blockly.Generator} generator The generator to use in test.
 * @return {function(!CodeGenerationTestCase):!Function} Function that
 *    returns mocha test callback based on test case.
 * @private
 */
const createCodeGenerationTestFn_ = (generator) => {
  return (testCase) => {
    return function() {
      const block = testCase.createBlock(this.workspace);
      let code;
      let innerOrder;
      if (testCase.useWorkspaceToCode) {
        code = generator.workspaceToCode(this.workspace);
      } else {
        generator.init(this.workspace);
        code = generator.blockToCode(block);
        if (Array.isArray(code)) {
          innerOrder = code[1];
          code = code[0];
        }
      }
      const assertFunc = (typeof testCase.expectedCode === 'string') ?
          assert.equal : assert.match;
      assertFunc(code, testCase.expectedCode);
      if (!testCase.useWorkspaceToCode &&
          testCase.expectedInnerOrder !== undefined) {
        assert.equal(innerOrder, testCase.expectedInnerOrder);
      }
    };
  };
};

/**
 * Runs blockToCode test suites.
 * @param {!Array<!CodeGenerationTestSuite>} testSuites The test suites to run.
 */
export const runCodeGenerationTestSuites = (testSuites) => {
  /**
   * Creates function used to generate mocha test callback.
   * @param {!CodeGenerationTestSuite} suiteInfo The test suite information.
   * @return {function(!CodeGenerationTestCase):!Function} Function that
   *    creates mocha test callback.
   */
  const createTestFn = (suiteInfo) => {
    return createCodeGenerationTestFn_(suiteInfo.generator);
  };

  runTestSuites(testSuites, createTestFn);
};

/**
 * Runs serialization test suite.
 * @param {!Array<!SerializationTestCase>} testCases The test cases to run.
 */
export const runSerializationTestSuite = (testCases) => {
  /**
   * Creates test callback for xmlToBlock test.
   * @param {!SerializationTestCase} testCase The test case information.
   * @return {!Function} The test callback.
   */
  const createXmlToBlockTestCallback = (testCase) => {
    return function() {
      const block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
          testCase.xml), this.workspace);
      testCase.assertBlockStructure(block);
    };
  };
  /**
   * Creates test callback for xml round trip test.
   * @param {!SerializationTestCase} testCase The test case information.
   * @return {!Function} The test callback.
   */
  const createXmlRoundTripTestCallback = (testCase) => {
    return function() {
      const block = Blockly.Xml.domToBlock(Blockly.Xml.textToDom(
          testCase.xml), this.workspace);
      const generatedXml =
          Blockly.Xml.domToPrettyText(
              Blockly.Xml.blockToDom(block));
      const expectedXml = testCase.expectedXml || testCase.xml;
      assert.equal(generatedXml, expectedXml);
    };
  };
  suite('Serialization', function() {
    suite('xmlToBlock', function() {
      runTestCases(testCases, createXmlToBlockTestCallback);
    });
    suite('xml round-trip', function() {
      setup(function() {
        // The genUid is undergoing change as part of the 2021Q3
        // goog.module migration:
        //
        // - It is being moved from Blockly.utils to
        //   Blockly.utils.idGenerator (which itself is being renamed
        //   from IdGenerator).
        // - For compatibility with changes to the module system (from
        //   goog.provide to goog.module and in future to ES modules),
        //   .genUid is now a wrapper around .TEST_ONLY.genUid, which
        //   can be safely stubbed by sinon or other similar
        //   frameworks in a way that will continue to work.
        if (Blockly.utils.idGenerator &&
            Blockly.utils.idGenerator.TEST_ONLY) {
          sinon.stub(Blockly.utils.idGenerator.TEST_ONLY, 'genUid')
              .returns('1');
        } else {
          // Fall back to stubbing original version on Blockly.utils.
          sinon.stub(Blockly.utils, 'genUid').returns('1');
        }
      });

      teardown(function() {
        sinon.restore();
      });

      runTestCases(testCases, createXmlRoundTripTestCallback);
    });
  });
};
