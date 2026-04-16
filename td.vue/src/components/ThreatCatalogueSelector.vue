<template>
    <div>
        <b-modal
            id="threat-catalogue-selector"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="$t('threats.catalogue.selectThreat')"
            ref="catalogueModal"
        >
            <!-- Search bar -->
            <b-form-input
                v-model="searchQuery"
                :placeholder="$t('threats.catalogue.search')"
                class="mb-3"
            />

            <!-- No catalogue / status messages -->
            <b-alert v-if="threatCatalogueStoreStatus === 'NOT_CONFIGURED'" show variant="warning">
                {{ $t('threats.catalogue.selectThreat') }}
            </b-alert>
            <b-alert v-else-if="threatCatalogueStoreStatus === 'NOT_INITIALIZED'" show variant="info">
                {{ $t('threats.catalogue.selectThreat') }}
            </b-alert>
            <b-alert v-else-if="!filteredThreats.length" show variant="info">
                {{ $t('threats.catalogue.selectThreat') }}
            </b-alert>

            <!-- Threat list -->
            <b-list-group v-else>
                <b-list-group-item
                    v-for="threat in filteredThreats"
                    :key="threat.id"
                    :active="isSelected(threat.id)"
                    button
                    @click="toggleSelect(threat)"
                    class="d-flex justify-content-between align-items-start"
                >
                    <div>
                        <strong>{{ threat.title }}</strong>
                        <b-badge variant="secondary" class="ml-2">{{ threat.type }}</b-badge>
                        <div class="text-muted small mt-1">{{ threat.briefDescription }}</div>
                    </div>
                    <b-badge v-if="isSelected(threat.id)" variant="primary">&#10003;</b-badge>
                </b-list-group-item>
            </b-list-group>

            <template #modal-footer>
                <div class="w-100">
                    <b-button
                        variant="primary"
                        class="float-right"
                        :disabled="!selected.length"
                        @click="applySelected()"
                    >
                        {{ $t('threats.catalogue.addSelected') }} ({{ selected.length }})
                    </b-button>
                    <b-button variant="secondary" class="float-left" @click="hideModal()">
                        {{ $t('forms.cancel') }}
                    </b-button>
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex';
import { createThreatFromCatalogue } from '@/service/threats/index.js';
import { CELL_DATA_UPDATED } from '@/store/actions/cell.js';
import tmActions from '@/store/actions/threatmodel.js';
import dataChanged from '@/service/x6/graph/data-changed.js';
import threatCatalogueApi from '@/service/api/threatCatalogueApi.js';

export default {
    name: 'TdThreatCatalogueSelector',
    data() {
        return {
            searchQuery: '',
            selected: []
        };
    },
    computed: {
        ...mapState({
            cellRef: (state) => state.cell.ref,
            diagram: (state) => state.threatmodel.selectedDiagram,
            threatTop: (state) => state.threatmodel.data.detail.threatTop
        }),
        ...mapGetters(['threatCatalogue', 'threatCatalogueStoreStatus']),
        filteredThreats() {
            return this.threatCatalogue.filter(t => {
                const matchesFramework = t.modelType === this.diagram?.diagramType;
                const matchesSearch = !this.searchQuery
                    || t.title.toLowerCase().includes(this.searchQuery.toLowerCase())
                    || t.type.toLowerCase().includes(this.searchQuery.toLowerCase())
                    || (t.briefDescription || '').toLowerCase().includes(this.searchQuery.toLowerCase());
                return matchesFramework && matchesSearch;
            });
        }
    },
    methods: {
        showModal() {
            this.searchQuery = '';
            this.selected = [];
            this.$refs.catalogueModal.show();
        },
        hideModal() {
            this.$refs.catalogueModal.hide();
        },
        isSelected(id) {
            return this.selected.some(t => t.id === id);
        },
        toggleSelect(threat) {
            if (this.isSelected(threat.id)) {
                this.selected = this.selected.filter(t => t.id !== threat.id);
            } else {
                this.selected.push(threat);
            }
        },
        async applySelected() {
            let threatTop = this.threatTop;
            for (const catalogueThreat of this.selected) {
                threatTop++;
                const response = await threatCatalogueApi.fetchThreatContentAsync(catalogueThreat.id);
                const fullThreat = response.data.content;
                const threat = createThreatFromCatalogue(fullThreat, threatTop);
                this.cellRef.data.threats.push(threat);
            }
            this.cellRef.data.hasOpenThreats = true;
            this.$store.dispatch(tmActions.update, { threatTop });
            this.$store.dispatch(tmActions.modified);
            this.$store.dispatch(CELL_DATA_UPDATED, this.cellRef.data);
            dataChanged.updateStyleAttrs(this.cellRef);
            this.hideModal();
        }
    }
};
</script>
