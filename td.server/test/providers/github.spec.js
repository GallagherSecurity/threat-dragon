import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import env from '../../src/env/Env.js';
import githubProvider from '../../src/providers/github.js';
import repo from '../../src/repositories/github/index.js';

describe('providers/github.js', () => {
    describe('isConfigured', () => {
        it('returns true if GITHUB_CLIENT_ID is set', () => {
            const config = { GITHUB_CLIENT_ID: '1234567' };
            sinon.stub(env, 'get').returns({ config });
            expect(githubProvider.isConfigured()).to.be.true;
        });

        it('returns false if GITHUB_CLIENT_ID is not set', () => {
            expect(githubProvider.isConfigured()).to.be.false;
        });
    });

    describe('getOauthRedirectUrl', () => {
        const config = { GITHUB_CLIENT_ID: '1234567' };

        it('contains the github login oauth url', () => {
            expect(githubProvider.getOauthRedirectUrl()).to
                .contain('https://github.com/login/oauth/authorize');
        });

        it('adds the client_id', () => {
            sinon.stub(env, 'get').returns({ config });
            expect(githubProvider.getOauthRedirectUrl()).to
                .contain(`client_id=${config.GITHUB_CLIENT_ID}`);
        });

        it('uses the default scope', () => {
            expect(githubProvider.getOauthRedirectUrl()).to
                .contain('scope=public_repo');
        });

        it('uses the configured scope', () => {
            const scopedCfg = Object.assign({}, config, {
                GITHUB_SCOPE: 'repo'
            });
            sinon.stub(env, 'get').returns({ config: scopedCfg });
            expect(githubProvider.getOauthRedirectUrl()).to
                .contain('scope=repo');
        });

        it('leaves out the redirect_uri when it is not configured', () => {
            sinon.stub(env, 'get').returns({ config });
            expect(githubProvider.getOauthRedirectUrl()).not.to
                .contain('redirect_uri');
        });

        it('adds the encoded redirect_uri when it is configured', () => {
            const redirectCfg = Object.assign({}, config, {
                GITHUB_REDIRECT_URI: 'https://pr-12.dev.example.com/api/oauth/return'
            });
            sinon.stub(env, 'get').returns({ config: redirectCfg });
            expect(githubProvider.getOauthRedirectUrl()).to
                .contain('&redirect_uri=https%3A%2F%2Fpr-12.dev.example.com%2Fapi%2Foauth%2Freturn');
        });
    });

    describe('getOauthReturnUrl', () => {
        const code = '1234-5678';

        describe('simulated production', () => {
            beforeEach(() => {
                sinon.stub(env, 'get').returns({
                    config: {
                        NODE_ENV: 'simulated production'
                    }
                });
            });

            it('gives a relative url when not in development mode', () => {
                const idx = githubProvider.getOauthReturnUrl(code).indexOf('/#/oauth-return');
                expect(idx).to.eq(0);
            });

            it('adds the code as a query param', () => {
                expect(githubProvider.getOauthReturnUrl(code)).to
                    .contain(`code=${code}`);
            });
        });

        describe('development', () => {
            beforeEach(() => {
                sinon.stub(env, 'get').returns({
                    config: {
                        NODE_ENV: 'development'
                    }
                });
            });

            it('returns an absolute url with the front-end port', () => {
                const idx = githubProvider.getOauthReturnUrl(code).indexOf('http://localhost:8080');
                expect(idx).to.eq(0);
            });
        });
    });

    describe('completeLoginAsync', () => {
        const config = {
            GITHUB_CLIENT_ID: '12345678',
            GITHUB_CLIENT_SECRET: '098765432109865432'
        };
        const code = 'mycode';

        beforeEach(async () => {
            sinon.stub(axios, 'post').resolves({ data: { access_token: '' }});
            sinon.stub(env, 'get').returns({ config });
            sinon.stub(repo, 'userAsync').resolves({});

            await githubProvider.completeLoginAsync(code);
        });

        it('gets the access_token from github', () => {
            expect(axios.post).to.have.been.calledWith(
                'https://github.com/login/oauth/access_token',
                {
                    client_id: config.GITHUB_CLIENT_ID,
                    client_secret: config.GITHUB_CLIENT_SECRET,
                    code
                },
                {
                    headers: {
                        accept: 'application/json'
                    }
                }
            );
        });

        it('gets the user info from the repo', () => {
            expect(repo.userAsync).to.have.been.calledOnce;
        });
    });

    describe('completeLoginAsync with a redirect uri', () => {
        const redirectUri = 'https://pr-12.dev.example.com/api/oauth/return';

        beforeEach(async () => {
            sinon.stub(axios, 'post').resolves({ data: { access_token: '' }});
            sinon.stub(env, 'get').returns({ config: { GITHUB_REDIRECT_URI: redirectUri } });
            sinon.stub(repo, 'userAsync').resolves({});

            await githubProvider.completeLoginAsync('mycode');
        });

        it('sends the same redirect_uri to the token exchange', () => {
            expect(axios.post.firstCall.args[1].redirect_uri).to.equal(redirectUri);
        });
    });
});