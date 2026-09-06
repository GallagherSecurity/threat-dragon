<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>{{ $t('threats.mitigations.catalogue.manage') }}</h4>
                    <p class="lead">{{ $t('threats.mitigations.catalogue.manageDescription') }}</p>
                </b-jumbotron>
            </b-col>
        </b-row>

        <!-- NOT_INITIALIZED -->
        <b-row v-if="mitigationCatalogueStoreStatus === 'NOT_INITIALIZED'">
            <b-col md="6" offset-md="3">
                <b-card class="text-center p-4">
                    <h4>{{ $t('threats.mitigations.catalogue.notInitialized') }}</h4>
                    <p class="text-muted">{{ $t('threats.mitigations.catalogue.bootstrapDescription') }}</p>
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
                    <b-button variant="primary" @click="onAddClick" class="mr-2">
                        + {{ $t('threats.mitigations.catalogue.addNew') }}
                    </b-button>
                    <b-button variant="secondary" @click="onImportClick" class="mr-2">
                        {{ $t('threats.mitigations.catalogue.import') }}
                    </b-button>
                    <b-button variant="secondary" :disabled="!selectedIds.length" @click="onExportClick" class="mr-2">
                        {{ $t('threats.catalogue.actions.exportSelected') }} ({{ selectedIds.length }})
                    </b-button>
                    <b-button
                        v-if="filteredMitigations.length"
                        variant="outline-secondary"
                        class="mr-2"
                        @click="toggleSelectAll"
                    >
                        {{ allFilteredSelected ? $t('threats.catalogue.deselectAll') : $t('threats.catalogue.selectAll') }}
                    </b-button>
                    <b-button
                        v-if="selectedIds.length > 0"
                        variant="danger"
                        @click="onBulkDeleteClick"
                    >
                        Delete Selected ({{ selectedIds.length }})
                    </b-button>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-form-row>
                        <b-col md="10">
                            <b-form-input v-model="searchQuery" :placeholder="$t('threats.mitigations.catalogue.search')" />
                        </b-col>
                        <b-col md="2" class="d-flex align-items-center">
                            <b-button v-show="searchQuery" variant="link" class="p-0 text-muted" @click="searchQuery = ''" title="Clear">
                                &#x2715;
                            </b-button>
                        </b-col>
                    </b-form-row>
                    <small v-show="searchQuery" class="text-muted">
                        Showing {{ filteredMitigations.length }} of {{ mitigationCatalogue.length }} mitigations
                    </small>
                    <small v-show="selectedIds.length" class="text-muted ml-3">
                        {{ selectedIds.length }} selected
                    </small>
                </b-col>
            </b-row>

            <b-row class="mt-3">
                <b-col md="8" offset-md="2">
                    <b-list-group v-if="paginatedMitigations.length">
                        <b-list-group-item
                            v-for="mitigation in paginatedMitigations"
                            :key="mitigation.id"
                            class="d-flex justify-content-between align-items-start"
                        >
                            <div class="mr-3 d-flex align-items-center">
                                <input
                                    type="checkbox"
                                    :checked="selectedIds.includes(mitigation.id)"
                                    @change="toggleSelection(mitigation.id)"
                                />
                            </div>
                            <div class="flex-grow-1">
                                <div>
                                    <strong>{{ mitigation.title }}</strong>
                                </div>
                                <div class="text-muted small mt-1">{{ mitigation.briefDescription }}</div>
                            </div>
                            <b-dropdown right variant="link" class="item-actions">
                                <template #button-content>&#8942;</template>
                                <b-dropdown-item @click="onEditClick(mitigation)">
                                    {{ $t('forms.edit') }}
                                </b-dropdown-item>
                                <b-dropdown-divider></b-dropdown-divider>
                                <b-dropdown-item variant="danger" @click="onDeleteClick(mitigation)">
                                    {{ $t('forms.delete') }}
                                </b-dropdown-item>
                            </b-dropdown>
                        </b-list-group-item>
                    </b-list-group>
                    <b-alert v-else show variant="info">{{ emptyMessage }}</b-alert>

                    <div v-if="filteredMitigations.length" class="d-flex justify-content-between align-items-center mt-3">
                        <div class="d-flex align-items-center">
                            <small class="text-muted mr-2">{{ $t('threats.catalogue.perPage') }}</small>
                            <select v-model.number="pageSize" class="form-control form-control-sm" style="width:auto">
                                <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
                            </select>
                        </div>
                        <div v-if="totalPages > 1" class="pagination mb-0">
                            <button @click="currentPage--" :disabled="currentPage === 1">{{ $t('threats.catalogue.previous') }}</button>
                            <button class="btn" :disabled="true">{{ currentPage }} / {{ totalPages }}</button>
                            <button @click="currentPage++" :disabled="currentPage === totalPages">{{ $t('threats.catalogue.next') }}</button>
                        </div>
                    </div>
                </b-col>
            </b-row>
        </template>

        <td-mitigation-catalogue-form ref="mitigationForm" />
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import mcActions from '@/store/actions/mitigationCatalogue.js';
import schema from '@/service/schema/ajv.js';
import TdMitigationCatalogueForm from '@/components/MitigationCatalogueForm.vue';

export default {
    name: 'ManageMitigationCatalogue',
    components: { TdMitigationCatalogueForm },
    data() {
        return {
            isBootstrapping: false,
            searchQuery: '',
            selectedIds: [],
            currentPage: 1,
            pageSize: 25,
            pageSizeOptions: [10, 25, 50, 100]
        };
    },
    computed: {
        ...mapGetters(['mitigationCatalogue', 'mitigationCatalogueStoreStatus']),
        isFiltering() {
            return !!this.searchQuery;
        },
        emptyMessage() {
            return this.isFiltering
                ? this.$t('threats.catalogue.noResults')
                : this.$t('threats.mitigations.catalogue.noMitigations');
        },
        allFilteredSelected() {
            return this.paginatedMitigations.length > 0 &&
                this.paginatedMitigations.every(m => this.selectedIds.includes(m.id));
        },
        filteredMitigations() {
            if (!this.searchQuery) return this.mitigationCatalogue;
            const q = this.searchQuery.toLowerCase();
            return this.mitigationCatalogue.filter(m =>
                (m.title || '').toLowerCase().includes(q) ||
                (m.briefDescription || '').toLowerCase().includes(q)
            );
        },
        paginatedMitigations() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.filteredMitigations.slice(start, start + this.pageSize);
        },
        totalPages() {
            return Math.ceil(this.filteredMitigations.length / this.pageSize) || 1;
        }
    },
    watch: {
        filteredMitigations() {
            this.currentPage = 1;
        },
        pageSize() {
            this.currentPage = 1;
        }
    },
    mounted() {
        this.$store.dispatch(mcActions.fetchAll);
    },
    methods: {
        async handleBootstrap() {
            this.isBootstrapping = true;
            try {
                await this.$store.dispatch(mcActions.bootstrap);
                this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.initialiseSuccess'));
            } catch (e) {
                console.error('Bootstrap failed:', e);
                this.$toast.error(this.$t('threats.mitigations.catalogue.errors.initialiseFailed'));
            } finally {
                this.isBootstrapping = false;
            }
        },
        onAddClick() {
            this.$refs.mitigationForm.showModal();
        },
        async onEditClick(mitigation) {
            try {
                const response = await this.$store.dispatch(mcActions.fetchById, mitigation.id);
                this.$refs.mitigationForm.showModal({ id: mitigation.id, ...response.content });
            } catch (e) {
                console.error('Failed to load mitigation:', e);
                this.$toast.error(this.$t('threats.mitigations.catalogue.errors.updateFailed'));
            }
        },
        async onExportClick() {
            try {
                await this.$store.dispatch(mcActions.export, [...this.selectedIds]);
                this.$toast.success(this.$t('threats.catalogue.prompts.exportSuccess'));
            } catch (e) {
                console.error('Export failed:', e);
                this.$toast.error(this.$t('threats.catalogue.errors.exportFailed'));
            }
        },
        async onImportClick() {
            if ('showOpenFilePicker' in window) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        types: [{ description: 'Mitigation Library Files', accept: { 'application/json': ['.json'] } }],
                        multiple: false
                    });
                    const file = await handle.getFile();
                    await this.importMitigationLibrary(file);
                } catch (e) {
                    console.warn('File picker cancelled');
                }
            } else {
                this.$toast.error(this.$t('threats.catalogue.errors.filePickerUnsupported'));
            }
        },
        async importMitigationLibrary(file) {
            let libraryData;
            try {
                const text = await file.text();
                libraryData = JSON.parse(text);
            } catch (e) {
                this.$toast.error(this.$t('threats.catalogue.errors.invalidJson'));
                return;
            }

            const validation = schema.validateMitigationLibraryFormat(libraryData);
            if (!validation.valid) {
                console.warn('Mitigation library validation failed:', validation.errors);
                this.$toast.error(this.$t('threats.mitigations.catalogue.errors.invalidLibrary'));
                return;
            }

            try {
                const results = await this.$store.dispatch(mcActions.import, libraryData.mitigationLibrary);
                const msg = `${results.created} mitigation${results.created !== 1 ? 's' : ''} added, ${results.skipped} skipped`;
                this.$toast.success(msg);
            } catch (e) {
                console.error('Import failed:', e);
                this.$toast.error(this.$t('threats.mitigations.catalogue.errors.importFailed'));
            }
        },
        toggleSelectAll() {
            if (this.allFilteredSelected) {
                const pageIds = this.paginatedMitigations.map(m => m.id);
                this.selectedIds = this.selectedIds.filter(id => !pageIds.includes(id));
            } else {
                const toAdd = this.paginatedMitigations.map(m => m.id).filter(id => !this.selectedIds.includes(id));
                this.selectedIds = [...this.selectedIds, ...toAdd];
            }
        },
        toggleSelection(id) {
            const idx = this.selectedIds.indexOf(id);
            if (idx === -1) {
                this.selectedIds.push(id);
            } else {
                this.selectedIds.splice(idx, 1);
            }
        },
        async onDeleteClick(mitigation) {
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete "${mitigation.title}"? This cannot be undone.`,
                {
                    title: this.$t('threats.mitigations.catalogue.deleteTitle'),
                    okVariant: 'danger',
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    centered: true
                }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(mcActions.delete, mitigation.id);
                    this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.deleteSuccess'));
                } catch (e) {
                    console.error('Delete failed:', e);
                    this.$toast.error(this.$t('threats.mitigations.catalogue.errors.deleteFailed'));
                }
            }
        },
        async onBulkDeleteClick() {
            const count = this.selectedIds.length;
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Delete ${count} selected mitigation${count > 1 ? 's' : ''}? This cannot be undone.`,
                {
                    title: this.$t('threats.mitigations.catalogue.deleteBulkTitle'),
                    okVariant: 'danger',
                    okTitle: this.$t('forms.delete'),
                    cancelTitle: this.$t('forms.cancel'),
                    centered: true
                }
            );
            if (confirmed) {
                try {
                    await this.$store.dispatch(mcActions.bulkDelete, [...this.selectedIds]);
                    this.$toast.success(this.$t('threats.mitigations.catalogue.prompts.deleteSuccess'));
                    this.selectedIds = [];
                } catch (e) {
                    console.error('Bulk delete failed:', e);
                    this.$toast.error(this.$t('threats.mitigations.catalogue.errors.deleteFailed'));
                }
            }
        }
    }
};
</script>

<style scoped>
.item-actions >>> .btn::after,
.item-actions >>> .dropdown-toggle::after {
    display: none !important;
}
</style>
