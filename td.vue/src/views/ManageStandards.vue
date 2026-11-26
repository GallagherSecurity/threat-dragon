<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <td-hero class="text-center">
                    <h4>{{ $t('standards.manage') }}</h4>
                    <p class="lead">{{ $t('standards.manageDescription') }}</p>
                </td-hero>
            </b-col>
        </b-row>

        <!-- NOT_CONFIGURED and NOT_FOUND can't reach this page: admin rights need a valid content repo -->
        <!-- Status: ERROR -->
        <b-row v-if="standardsStatus === 'ERROR'">
            <b-col md="6" offset-md="3">
                <b-alert show variant="danger" class="text-center">
                    <h5>{{ $t('standards.status.error.title') }}</h5>
                    <p>{{ $t('standards.status.error.web') }}</p>
                </b-alert>
            </b-col>
        </b-row>

        <!-- NOT_INITIALIZED -->
        <b-row v-else-if="standardsStatus === 'NOT_INITIALIZED'">
            <b-col md="6" offset-md="3">
                <b-card class="text-center p-4">
                    <h4>{{ $t('standards.notInitialized') }}</h4>
                    <p class="text-muted">{{ $t('standards.bootstrapDescription') }}</p>
                    <b-button variant="primary" size="lg" :disabled="isBootstrapping" @click="handleBootstrap">
                        <b-spinner small v-if="isBootstrapping" class="mr-2"></b-spinner>
                        {{ isBootstrapping ? $t('threats.catalogue.actions.initialising') : $t('threats.catalogue.actions.initialise') }}
                    </b-button>
                </b-card>
            </b-col>
        </b-row>

        <!-- Normal -->
        <template v-else>
            <b-row>
                <b-col md="8" offset-md="2">
                    <b-form @submit.prevent="onAdd">
                        <b-form-row>
                            <b-col md="9">
                                <b-form-input
                                    id="new-standard-name"
                                    v-model="newName"
                                    :placeholder="$t('standards.namePlaceholder')"
                                    :aria-label="$t('standards.namePlaceholder')"
                                    :state="isDuplicate ? false : null"
                                />
                            </b-col>
                            <b-col md="3">
                                <b-button type="submit" variant="primary" block :disabled="!canAdd">
                                    + {{ $t('standards.add') }}
                                </b-button>
                            </b-col>
                        </b-form-row>
                        <small v-show="isDuplicate" class="text-danger">
                            {{ $t('standards.duplicate') }}
                        </small>
                    </b-form>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-list-group v-if="allStandards.length">
                        <b-list-group-item
                            v-for="standard in allStandards"
                            :key="standard.id"
                            class="d-flex justify-content-between align-items-center"
                        >
                            {{ standard.name }}
                            <td-dropdown right variant="link" no-caret class="standard-actions">
                                <template #button-content>
                                    <font-awesome-icon icon="ellipsis-v"></font-awesome-icon>
                                </template>
                                <template #default="{ close }">
                                    <button
                                        type="button"
                                        class="td-dropdown-item td-dropdown-item-danger"
                                        @click="onDeleteStandard(standard); close()"
                                    >
                                        <font-awesome-icon icon="trash" class="mr-2"></font-awesome-icon>
                                        {{ $t('forms.delete') }}
                                    </button>
                                </template>
                            </td-dropdown>
                        </b-list-group-item>
                    </b-list-group>
                    <b-alert v-else show variant="info">{{ $t('standards.empty') }}</b-alert>
                </b-col>
            </b-row>
        </template>

        <!-- Delete confirmation -->
        <b-modal
            id="delete-standard-modal"
            :title="$t('standards.deleteTitle')"
            ok-variant="danger"
            :ok-title="$t('forms.delete')"
            :cancel-title="$t('forms.cancel')"
            centered
            @ok="onConfirmDelete"
        >
            <template v-if="deleteTarget">
                <p>{{ $t('standards.deleteConfirm', { name: deleteTarget.name }) }}</p>
                <template v-if="deleteUsedBy.length">
                    <p class="mb-1">{{ $t('standards.deleteInUse', { count: deleteUsedBy.length }) }}</p>
                    <ul class="delete-usage-list">
                        <li v-for="mitigation in deleteUsedBy" :key="mitigation.id">{{ mitigation.title }}</li>
                    </ul>
                    <p class="text-muted small mb-0">{{ $t('standards.deleteKeepsModels') }}</p>
                </template>
            </template>
        </b-modal>
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import mcActions from '@/store/actions/mitigationCatalogue.js';
import standardsActions from '@/store/actions/standards.js';
import TdDropdown from '@/components/Dropdown.vue';
import TdHero from '@/components/Hero.vue';

export default {
    name: 'ManageStandards',
    components: {
        TdDropdown,
        TdHero
    },
    data() {
        return {
            isBootstrapping: false,
            newName: '',
            isAdding: false,
            deleteTarget: null
        };
    },
    computed: {
        ...mapGetters(['allStandards', 'standardsStatus', 'mitigationCatalogue']),
        deleteUsedBy() {
            if (!this.deleteTarget) return [];
            return this.mitigationCatalogue.filter(m => (m.standards || []).includes(this.deleteTarget.name));
        },
        trimmedName() {
            return this.newName.trim();
        },
        isDuplicate() {
            const name = this.trimmedName.toLowerCase();
            return !!name && this.allStandards.some(s => s.name.toLowerCase() === name);
        },
        canAdd() {
            return !!this.trimmedName && !this.isDuplicate && !this.isAdding;
        }
    },
    mounted() {
        this.$store.dispatch(standardsActions.fetch);
        this.$store.dispatch(mcActions.fetchAll);
    },
    methods: {
        async handleBootstrap() {
            this.isBootstrapping = true;
            try {
                await this.$store.dispatch(standardsActions.bootstrap);
                this.$toast.success(this.$t('standards.prompts.initialiseSuccess'));
            } catch (e) {
                console.error('Bootstrap failed:', e);
                this.$toast.error(this.$t('standards.errors.initialiseFailed'));
            } finally {
                this.isBootstrapping = false;
            }
        },
        async onAdd() {
            if (!this.canAdd) return;
            this.isAdding = true;
            try {
                await this.$store.dispatch(standardsActions.create, this.trimmedName);
                this.$toast.success(this.$t('standards.prompts.createSuccess'));
                this.newName = '';
            } catch (e) {
                console.error('Failed to add standard:', e);
                this.$toast.error(this.$t('standards.errors.createFailed'));
            } finally {
                this.isAdding = false;
            }
        },
        onDeleteStandard(standard) {
            this.deleteTarget = standard;
            this.$bvModal.show('delete-standard-modal');
        },
        async onConfirmDelete() {
            const standard = this.deleteTarget;
            try {
                const mitigationsUpdated = await this.$store.dispatch(standardsActions.delete, standard.id);
                this.$toast.success(mitigationsUpdated
                    ? this.$t('standards.prompts.deleteSuccessInUse', { count: mitigationsUpdated })
                    : this.$t('standards.prompts.deleteSuccess'));
                if (mitigationsUpdated) {
                    this.$store.dispatch(mcActions.fetchAll);
                }
            } catch (e) {
                console.error('Failed to delete standard:', e);
                this.$toast.error(this.$t('standards.errors.deleteFailed'));
            }
        }
    }
};
</script>

<style scoped>
.delete-usage-list {
    max-height: 12rem;
    overflow-y: auto;
}
</style>
