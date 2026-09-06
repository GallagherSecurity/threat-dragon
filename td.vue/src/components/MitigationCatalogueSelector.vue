<template>
    <div>
        <b-modal
            id="mitigation-catalogue-selector"
            size="lg"
            ok-variant="primary"
            header-bg-variant="primary"
            header-text-variant="light"
            :title="$t('threats.mitigations.newFromCatalogue')"
            ref="selectorModal"
            hide-footer
        >
            <b-form-input
                v-model="searchQuery"
                :placeholder="$t('threats.mitigations.catalogue.search')"
                class="mb-3"
            />

            <b-list-group v-if="filteredMitigations.length">
                <b-list-group-item
                    v-for="mitigation in filteredMitigations"
                    :key="mitigation.id"
                    href="#"
                    @click.prevent="selectMitigation(mitigation)"
                    class="catalogue-item"
                >
                    <div>
                        <strong>{{ mitigation.title }}</strong>
                       
                    </div>
                    <div v-if="mitigation.briefDescription" class="text-muted small mt-1">
                        {{ mitigation.briefDescription }}
                    </div>
                </b-list-group-item>
            </b-list-group>

            <b-alert v-else-if="mitigationCatalogue.length === 0" show variant="info">
                {{ $t('threats.mitigations.catalogue.noMitigations') }}
            </b-alert>
            <b-alert v-else show variant="info">
                {{ $t('threats.catalogue.noResults') }}
            </b-alert>
        </b-modal>
    </div>
</template>

<style scoped>
.catalogue-item:hover {
    background-color: #f5f5f5;
    cursor: pointer;
}
</style>

<script>
import { mapGetters } from 'vuex';
import mcActions from '@/store/actions/mitigationCatalogue.js';

export default {
    name: 'TdMitigationCatalogueSelector',

    data() {
        return {
            searchQuery: ''
        };
    },

    computed: {
        ...mapGetters(['mitigationCatalogue']),
        filteredMitigations() {
            if (!this.searchQuery) return this.mitigationCatalogue;
            const q = this.searchQuery.toLowerCase();
            return this.mitigationCatalogue.filter(m =>
                (m.title || '').toLowerCase().includes(q) ||
                (m.briefDescription || '').toLowerCase().includes(q)
            );
        }
    },

    methods: {
        open() {
            this.searchQuery = '';
            this.$store.dispatch(mcActions.fetchAll);
            this.$refs.selectorModal.show();
        },

        async selectMitigation(catalogueEntry) {
            try {
                const response = await this.$store.dispatch(mcActions.fetchById, catalogueEntry.id);
                const full = response.content;
                this.$emit('mitigationSelected', {
                    title: full.title || '',
                    description: full.description || '',
                    clauses: (full.clauses || []).map(c => ({ ...c }))
                });
                this.$refs.selectorModal.hide();
            } catch (e) {
                console.error('Failed to fetch catalogue mitigation:', e);
            }
        }
    }
};
</script>
