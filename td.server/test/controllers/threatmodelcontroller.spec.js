import { expect } from 'chai';
import sinon from 'sinon';

import { getMockRequest, getMockResponse } from '../mocks/express.mocks.js';
import env from '../../src/env/Env.js';
import repositories from '../../src/repositories/index.js';
import threatModelController from '../../src/controllers/threatmodelcontroller.js';

describe('controllers/threatmodelcontroller.js', () => {
    let mockRepository, mockRequest, mockResponse;

    beforeEach(() => {
        mockRequest = getMockRequest();
        mockResponse = getMockResponse();
        mockRepository = {
            searchAsync: sinon.stub().resolves([{ items: [{ full_name: 'org/searched' }] }, {}]),
            reposAsync: sinon.stub().resolves([[{ full_name: 'org/listed' }], {}])
        };
        sinon.stub(repositories, 'get').returns(mockRepository);
    });

    describe('repos', () => {
        describe('without search enabled', () => {
            beforeEach(async () => {
                sinon.stub(env, 'get').returns({ config: {} });
                mockRequest.query = { page: 2, searchQuery: 'foo' };
                await threatModelController.repos(mockRequest, mockResponse);
            });

            it('lists the user repos', () => {
                expect(mockRepository.reposAsync).to.have.been.calledWith(2, 'blah', ['foo']);
            });

            it('does not search', () => {
                expect(mockRepository.searchAsync).not.to.have.been.called;
            });

            it('returns the repo names', () => {
                expect(mockResponse.json).to.have.been.calledWithMatch({ data: { repos: ['org/listed'] } });
            });
        });

        describe('with search enabled and a configured query', () => {
            beforeEach(() => {
                sinon.stub(env, 'get').returns({
                    config: { REPO_USE_SEARCH: 'true', REPO_SEARCH_QUERY: 'org:foo fork:true' }
                });
            });

            it('combines the configured query with the user query', async () => {
                mockRequest.query = { searchQuery: 'bar' };
                await threatModelController.repos(mockRequest, mockResponse);
                expect(mockRepository.searchAsync).to.have.been.calledWith(1, 'blah', ['org:foo fork:true bar']);
            });

            it('searches with only the configured query when the user query is empty', async () => {
                await threatModelController.repos(mockRequest, mockResponse);
                expect(mockRepository.searchAsync).to.have.been.calledWith(1, 'blah', ['org:foo fork:true']);
            });

            it('returns the search result repo names', async () => {
                await threatModelController.repos(mockRequest, mockResponse);
                expect(mockResponse.json).to.have.been.calledWithMatch({ data: { repos: ['org/searched'] } });
            });
        });

        describe('with a search provider that returns a plain array', () => {
            beforeEach(async () => {
                sinon.stub(env, 'get').returns({ config: { REPO_USE_SEARCH: 'true', REPO_SEARCH_QUERY: 'foo' } });
                mockRepository.searchAsync.resolves([[{ full_name: 'group/project' }], null, { next: true, prev: false }]);
                await threatModelController.repos(mockRequest, mockResponse);
            });

            it('returns the repo names', () => {
                expect(mockResponse.json).to.have.been.calledWithMatch({ data: { repos: ['group/project'] } });
            });
        });

        describe('with legacy github search vars', () => {
            beforeEach(async () => {
                sinon.stub(env, 'get').returns({
                    config: { GITHUB_USE_SEARCH: 'true', GITHUB_SEARCH_QUERY: 'org:legacy' }
                });
                await threatModelController.repos(mockRequest, mockResponse);
            });

            it('searches with the github search query', () => {
                expect(mockRepository.searchAsync).to.have.been.calledWith(1, 'blah', ['org:legacy']);
            });
        });

        describe('with search enabled and only a user query', () => {
            beforeEach(async () => {
                sinon.stub(env, 'get').returns({ config: { REPO_USE_SEARCH: 'true' } });
                mockRequest.query = { searchQuery: 'bar' };
                await threatModelController.repos(mockRequest, mockResponse);
            });

            it('searches with the user query', () => {
                expect(mockRepository.searchAsync).to.have.been.calledWith(1, 'blah', ['bar']);
            });
        });

        describe('with search enabled but no query at all', () => {
            beforeEach(async () => {
                sinon.stub(env, 'get').returns({ config: { REPO_USE_SEARCH: 'true' } });
                await threatModelController.repos(mockRequest, mockResponse);
            });

            it('does not send an empty search', () => {
                expect(mockRepository.searchAsync).not.to.have.been.called;
            });

            it('falls back to listing the user repos', () => {
                expect(mockRepository.reposAsync).to.have.been.calledWith(1, 'blah', ['']);
            });

            it('responds with 200', () => {
                expect(mockResponse.status).to.have.been.calledWith(200);
            });
        });
    });
});
