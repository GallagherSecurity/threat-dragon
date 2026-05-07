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

            <!-- Status messages -->
            <b-alert v-if="threatCatalogueStoreStatus === 'NOT_CONFIGURED'" show variant="warning">
                {{ $t('threats.catalogue.notConfigured') }}
            </b-alert>
            <b-alert v-else-if="threatCatalogueStoreStatus === 'NOT_INITIALIZED'" show variant="info">
                {{ $t('threats.catalogue.notInitialized') }}
            </b-alert>
            <b-alert v-else-if="!filteredThreats.length" show variant="info">
                {{ $t('threats.catalogue.emptyCatalogue') }}
            </b-alert>

            <!-- Accordion threat list grouped by type -->
            <div v-else>
                <div
                    v-for="(sectionThreats, typeName, idx) in groupedThreats"
                    :key="typeName"
                    class="mb-1"
                >
                    <b-button
                        block
                        v-b-toggle="`cat-type-${typeName}`"
                        variant="secondary"
                        class="text-left d-flex justify-content-between align-items-center"
                    >
                        <span>{{ typeName }}</span>
                        <b-badge variant="light" pill>{{ sectionThreats.length }}</b-badge>
                    </b-button>
                    <b-collapse :id="`cat-type-${typeName}`" :visible="idx === 0">
                        <b-list-group flush class="border border-top-0">
                            <b-list-group-item
                                v-for="threat in sectionThreats"
                                :key="threat.id"
                                :active="isSelected(threat.id)"
                                button
                                @click="toggleSelect(threat)"
                                class="d-flex justify-content-between align-items-start"
                            >
                                <div>
                                    <strong>{{ threat.title }}</strong>
                                    <div class="text-muted small mt-1">{{ threat.briefDescription }}</div>
                                </div>
                                <b-badge v-if="isSelected(threat.id)" variant="primary">&#10003;</b-badge>
                            </b-list-group-item>
                        </b-list-group>
                    </b-collapse>
                </div>
            </div>

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
import models from '@/service/threats/models/index.js';

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
        cellType() {
            return this.cellRef?.data?.type || null;
        },
        modelType() {
            return this.diagram?.diagramType || null;
        },
        allowedTypeLabels() {
            if (!this.modelType || !this.cellType) return null;
            const typeMap = models.getThreatTypesByElement(this.modelType, this.cellType);
            return new Set(Object.keys(typeMap).map(key => this.$t(key)));
        },
        filteredThreats() {
            let threats = this.threatCatalogue;

            if (this.modelType) {
                threats = threats.filter(t => t.modelType === this.modelType);
            }

            if (this.allowedTypeLabels) {
                threats = threats.filter(t => this.allowedTypeLabels.has(t.type));
            }

            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                threats = threats.filter(t =>
                    t.title.toLowerCase().includes(q) ||
                    t.type.toLowerCase().includes(q) ||
                    (t.briefDescription || '').toLowerCase().includes(q)
                );
            }

            return threats;
        },
        groupedThreats() {
            const groups = {};
            for (const threat of this.filteredThreats) {
                if (!groups[threat.type]) groups[threat.type] = [];
                groups[threat.type].push(threat);
            }
            return groups;
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
