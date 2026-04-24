<template>
    <div>
        <b-modal id="threat-catalogue-export" size="lg" header-bg-variant="primary" header-text-variant="light"
            title="Export Threats" ref="exportModal">
            <b-list-group v-if="threatCatalogue.length">
                <b-list-group-item v-for="threat in threatCatalogue" :key="threat.id" :active="isSelected(threat.id)"
                    button @click="toggleSelect(threat)" class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>{{ threat.title }}</strong>
                        <b-badge variant="secondary" class="ml-2">{{ threat.modelType }}</b-badge>
                        <b-badge variant="info" class="ml-1">{{ threat.type }}</b-badge>
                        <div class="text-muted small mt-1">{{ threat.briefDescription }}</div>
                    </div>
                    <b-badge v-if="isSelected(threat.id)" variant="primary">&#10003;</b-badge>
                </b-list-group-item>
            </b-list-group>

            <b-alert v-else show variant="info">No threats in the catalogue.</b-alert>

            <template #modal-footer>
                <div class="w-100">
                    <b-button variant="primary" class="float-right" :disabled="!selected.length"
                        @click="onExport">
                        Export Selected ({{ selected.length }})
                    </b-button>
                    <b-button variant="secondary" class="float-left" @click="hideModal">
                        Cancel
                    </b-button>
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import tcActions from '@/store/actions/threatCatalogue.js';

export default {
    name: 'TdThreatCatalogueExport',
    data() {
        return {
            selected: [],
        };
    },
    computed: {
        ...mapGetters(['threatCatalogue'])
    },
    methods: {
        showModal() {
            this.selected = [];
            this.$refs.exportModal.show();
        },
        hideModal() {
            this.$refs.exportModal.hide();
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
        async onExport() {
            try {
                await this.$store.dispatch(tcActions.export, this.selected);
                this.hideModal();
            } catch (error) {
                console.error('Export failed:', error);
            } 
        }

    }
};
</script>
