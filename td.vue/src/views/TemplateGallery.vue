<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>{{ $t('template.select') }}</h4>
                    <p class="lead">{{ $t('template.selectDescription') }}</p>
                </b-jumbotron>
            </b-col>
        </b-row>
        
        <!-- Search bar -->
        <b-row>
            <b-col md="6" offset-md="3">
                <b-form-group>
                    <b-input-group>
                        <b-form-input
                            v-model="searchQuery"
                            :placeholder="$t('template.search')"
                            @input="onSearchChange"
                        />
                    </b-input-group>
                </b-form-group>
            </b-col>
        </b-row>

        

        <!-- Template list -->
        <b-row >
            <b-col md="6" offset-md="3">
                <b-list-group v-if="templates.length > 0">
                    <b-list-group-item
                        v-for="template in templates"
                        :key="template.id"
                        href="javascript:void(0)"
                        @click="onTemplateClick(template)"
                        :data-template-id="template.id"
                    >
                        <h5>{{ template.name }}</h5>
                        <p class="mb-1 text-muted">{{ template.description }}</p>
                        <b-badge
                            v-for="tag in template.tags"
                            :key="tag"
                            variant="primary"
                            class="mr-1"
                        >
                            {{ tag }}
                        </b-badge>
                    </b-list-group-item>
                </b-list-group>
                
                <b-alert v-else show variant="info">
                    {{ $t('template.noTemplates') }}
                </b-alert>
            </b-col>
        </b-row>
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import templateActions from '@/store/actions/template.js';
import tmActions from '@/store/actions/threatmodel.js';

export default {
    name: 'TemplateGallery',
    data() {
        return {
            searchQuery: ''
        };
    },
    computed: {
        ...mapGetters({
            templates: 'templates',
        })
    },
    mounted() {
        this.$store.dispatch(templateActions.clear);
        this.$store.dispatch(templateActions.fetchAll);
    },
    methods: {
        async onTemplateClick(template) {
            try {
                // Fetch full template (with content)
                const fullTemplate = await this.$store.dispatch(
                    templateActions.fetchById, 
                    template.id
                );
        
                // Convert template to model with UUID regeneration
                const newModel = await this.$store.dispatch(tmActions.templateLoad, {
                    templateData: fullTemplate.content,
           
                });
        
                // Update with a filename
                this.$store.dispatch(tmActions.update, {
                    fileName: `${template.name}-${Date.now()}.json`
                });
        
                // Navigate to threat model view
                const params = { 
                    threatmodel: newModel.summary.title 
                };
                this.$router.push({ 
                    name: 'localThreatModel',
                    params 
                });
            } catch (error) {
                console.error('Error loading template:', error);
                this.$bvToast.toast('Failed to load template', {
                    title: 'Error',
                    variant: 'danger',
                    solid: true
                });
            }
        },
        
        onSearchChange() {
            // Debounce search
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.$store.dispatch(templateActions.setFilters, {
                    search: this.searchQuery
                });
            }, 300);
        }
    }
};
</script>