"use strict";

const chai = require('chai');
const assert = chai.assert;
const notionAPI = require('../../../app/api/notion/NotionAPI.js');
const notionFaqsCommand = require("../../../app/commands/notion/NotionFAQs.js");
const nock = require('nock');
const mockFAQsJsonResponse = require('./retrieve_faqs_mock.json');

describe( "NotionFAQs", () => {
  before(() => {
      const scope = nock(notionAPI.defaults.baseUrl)
        .get('/blocks/6a2ba0a4-fd1e-4381-b365-6ad5afd418fa/children')
        .reply(200, mockFAQsJsonResponse)
        .persist();
  } );

  after(() => { } );

  describe("Utilities Validation", () => {
    it( "should be a list of 10 faqs", async () => {
        const faqs = await notionFaqsCommand.retrieveFAQsPromise();
        assert.lengthOf(faqs, 10);
    } );

    it( "first question should be '1. What is Bankless DAO?'", async () => {
        const faqs = await notionFaqsCommand.retrieveFAQsPromise();
        assert.equal(faqs[0].question, "1. What is Bankless DAO?");
    } );
    it( "first answer should be correct", async () => {
        const faqs = await notionFaqsCommand.retrieveFAQsPromise();
        assert.equal(faqs[0].answer, " Bankless DAO is a decentralized community focused on driving adoption and awareness of bankless money systems like Ethereum, Bitcoin and DeFi. You can learn more here:  https://bankless-dao.gitbook.io/bankless-dao/starting-with-bankless-dao ");
    } );
  } );
} );