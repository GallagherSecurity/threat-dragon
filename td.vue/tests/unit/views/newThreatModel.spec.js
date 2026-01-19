import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import NewThreatModel from '@/views/NewThreatModel.vue';

describe('NewThreatModel.vue', () => {
    let localVue, mockStore, router;

    describe('local provider', () => {
        beforeEach(() => {
            localVue = createLocalVue();
            localVue.use(Vuex);
            mockStore = new Vuex.Store({
                state: {
                    provider: { selected: 'local' },
                    threatmodel: { stash: '' },
                    packageBuildVersion: '2.3.0'
                },
                actions: {
                    'THREATMODEL_CLEAR': () => {},
                    'THREATMODEL_SELECTED': () => {}
                }
            });
            jest.spyOn(mockStore, 'dispatch');
            router = { push: jest.fn() };
            shallowMount(NewThreatModel, {
                localVue,
                store: mockStore,
                mocks: {
                    $router: router,
                    $route: {
                        params: { foo: 'bar' }
                    }
                }
            });
        });

        it('clears the current threat model', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_CLEAR');
        });

        it('selects the new threatModel', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_SELECTED', expect.anything());
        });

        it('navigates to the edit page', () => {
            expect(router.push).toHaveBeenCalledWith({
                name: 'localThreatModelEdit',
                params: {
                    foo: 'bar',
                    threatmodel: 'New Threat Model'
                }
            });
        });
    });

    describe('git provider', () => {
        beforeEach(() => {
            localVue = createLocalVue();
            localVue.use(Vuex);
            mockStore = new Vuex.Store({
                state: {
                    provider: { selected: 'github' },
                    threatmodel: { stash: '' },
                    packageBuildVersion: '2.3.0'
                },
                actions: {
                    'THREATMODEL_CLEAR': () => {},
                    'THREATMODEL_SELECTED': () => {}
                }
            });
            jest.spyOn(mockStore, 'dispatch');
            router = { push: jest.fn() };
            shallowMount(NewThreatModel, {
                localVue,
                store: mockStore,
                mocks: {
                    $router: router,
                    $route: {
                        params: { foo: 'bar' }
                    }
                }
            });
        });

        it('clears the current threat model', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_CLEAR');
        });

        it('selects the new threatModel', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_SELECTED', expect.anything());
        });

        it('navigates to the edit page for creation', () => {
            expect(router.push).toHaveBeenCalledWith({
                name: 'gitThreatModelCreate',
                params: {
                    foo: 'bar',
                    threatmodel: 'New Threat Model'
                }
            });
        });
    });

    describe('google provider', () => {
        beforeEach(() => {
            localVue = createLocalVue();
            localVue.use(Vuex);
            mockStore = new Vuex.Store({
                state: {
                    provider: { selected: 'google' },
                    threatmodel: { stash: '' },
                    packageBuildVersion: '2.3.0'
                },
                actions: {
                    'THREATMODEL_CLEAR': () => {},
                    'THREATMODEL_SELECTED': () => {}
                }
            });
            jest.spyOn(mockStore, 'dispatch');
            router = { push: jest.fn() };
            shallowMount(NewThreatModel, {
                localVue,
                store: mockStore,
                mocks: {
                    $router: router,
                    $route: {
                        params: { foo: 'bar' }
                    }
                }
            });
        });

        it('clears the current threat model', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_CLEAR');
        });

        it('selects the new threatModel', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_SELECTED', expect.anything());
        });

        it('navigates to the edit page for creation', () => {
            expect(router.push).toHaveBeenCalledWith({
                name: 'googleThreatModelCreate',
                params: {
                    foo: 'bar',
                    threatmodel: 'New Threat Model'
                }
            });
        });
    });

    describe('desktop provider', () => {
        beforeEach(() => {
            localVue = createLocalVue();
            localVue.use(Vuex);
            mockStore = new Vuex.Store({
                state: {
                    provider: { selected: 'desktop' },
                    threatmodel: { stash: '' },
                    packageBuildVersion: '2.3.0'
                },
                actions: {
                    'THREATMODEL_CLEAR': () => {},
                    'THREATMODEL_SELECTED': () => {}
                }
            });
            jest.spyOn(mockStore, 'dispatch');
            router = { push: jest.fn() };
            shallowMount(NewThreatModel, {
                localVue,
                store: mockStore,
                mocks: {
                    $router: router,
                    $route: {
                        params: { foo: 'bar' }
                    }
                }
            });
        });

        it('clears the current threat model', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_CLEAR');
        });

        it('selects the new threatModel', () => {
            expect(mockStore.dispatch).toHaveBeenCalledWith('THREATMODEL_SELECTED', expect.anything());
        });

        it('navigates to the edit page', () => {
            expect(router.push).toHaveBeenCalledWith({
                name: 'desktopThreatModelEdit',
                params: {
                    foo: 'bar',
                    threatmodel: 'New Threat Model'
                }
            });
        });
    });

    describe('with stashed demo model', () => {
        const demoModel = {
            version: '2.3.0',
            summary: {
                title: 'Demo Threat Model',
                owner: 'Demo Owner',
                description: 'Demo Description',
                id: 1
            },
            detail: {
                contributors: [],
                diagrams: [],
                diagramTop: 0,
                reviewer: '',
                threatTop: 0
            }
        };

        beforeEach(() => {
            localVue = createLocalVue();
            localVue.use(Vuex);
            mockStore = new Vuex.Store({
                state: {
                    provider: { selected: 'github' },
                    threatmodel: { stash: JSON.stringify(demoModel) },
                    packageBuildVersion: '2.3.0'
                },
                actions: {
                    'THREATMODEL_CLEAR': () => {},
                    'THREATMODEL_SELECTED': () => {}
                }
            });
            jest.spyOn(mockStore, 'dispatch');
            router = { push: jest.fn() };
            shallowMount(NewThreatModel, {
                localVue,
                store: mockStore,
                mocks: {
                    $router: router,
                    $route: {
                        params: { foo: 'bar' }
                    }
                }
            });
        });

        it('does not clear the threat model when stash exists', () => {
            expect(mockStore.dispatch).not.toHaveBeenCalledWith('THREATMODEL_CLEAR');
        });

        it('does not select a new blank model', () => {
            expect(mockStore.dispatch).not.toHaveBeenCalledWith('THREATMODEL_SELECTED', expect.anything());
        });

        it('navigates with the stashed demo model title', () => {
            expect(router.push).toHaveBeenCalledWith({
                name: 'gitThreatModelCreate',
                params: {
                    foo: 'bar',
                    threatmodel: 'Demo Threat Model'
                }
            });
        });
    });
});
