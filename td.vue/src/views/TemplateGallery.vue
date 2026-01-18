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

        <!-- Import from Local button - always visible -->
        <b-row>
            <b-col md="6" offset-md="3">
                <b-button variant="primary" @click="onImportFromLocal" block class="mb-3">
                    <font-awesome-icon icon="cloud-upload" class="mr-2"></font-awesome-icon>
                    {{ $t('template.startFromLocalTemplate') }}
                </b-button>
            </b-col>
        </b-row>

        <!-- Scenario: NOT_CONFIGURED -->
        <b-row v-if="contentRepoStatus === 'NOT_CONFIGURED'">
            <b-col md="6" offset-md="3">
                <b-alert show variant="info" class="text-center">
                    <h5>{{ $t('template.repo.notConfigured.title') }}</h5>
                    <p>{{ $t('template.repo.notConfigured.userMessage') }}</p>
                </b-alert>
            </b-col>
        </b-row>

        <!-- Scenario: REPO_NOT_FOUND -->
        <b-row v-else-if="contentRepoStatus === 'REPO_NOT_FOUND'">
            <b-col md="6" offset-md="3">
                <b-alert show variant="danger" class="text-center">
                    <h5>{{ $t('template.repo.notFound.title') }}</h5>
                    <p>{{ $t('template.repo.notFound.userMessage', { repoName: contentRepoName }) }}</p>
                </b-alert>
            </b-col>
        </b-row>

        <!-- Scenario: NOT_INITIALIZED - Regular User -->
        <b-row v-else-if="contentRepoStatus === 'NOT_INITIALIZED' && !canInitializeRepo">
            <b-col md="6" offset-md="3">
                <b-alert show variant="warning" class="text-center">
                    <h5>{{ $t('template.repo.notInitialized.title') }}</h5>
                    <p>{{ $t('template.repo.notInitialized.userMessage') }}</p>
                </b-alert>

            </b-col>
        </b-row>

        <!-- Scenario: NOT_INITIALIZED - Admin -->
        <b-row v-else-if="contentRepoStatus === 'NOT_INITIALIZED' && canInitializeRepo">
            <b-col md="6" offset-md="3">
                <b-alert show variant="info" class="text-center">
                    <h5>{{ $t('template.repo.notInitialized.title') }}</h5>
                    <p>{{ $t('template.repo.notInitialized.adminMessage') }}</p>
                    <b-button variant="success" :to="{ name: 'ManageTemplates' }">
                        <font-awesome-icon icon="cog" class="mr-2"></font-awesome-icon>
                        {{ $t('template.manage') }}
                    </b-button>
                </b-alert>

            </b-col>
        </b-row>

        <!-- Normal operation (status === null) -->
        <template v-else>
            <!-- Search bar (only for git providers with remote templates) -->
            <b-row v-if="!isLocalProvider">
                <b-col md="6" offset-md="3">
                    <div class="d-flex mb-3">
                        <!-- Search bar -->
                        <b-form-input
                            v-model="searchQuery"
                            :placeholder="$t('template.search')"
                            @input="onSearchChange"
                            class="flex-grow-1" />
                    </div>
                </b-col>
            </b-row>

            <!-- Template list -->
            <b-row>
                <b-col md="6" offset-md="3">
                    <b-list-group v-if="templates.length > 0">
                        <b-list-group-item v-for="template in templates" :key="template.id" href="javascript:void(0)"
                            @click="onTemplateClick(template)" :data-template-id="template.id">
                            <h5>{{ template.name }}</h5>
                            <p class="mb-1 text-muted">{{ template.description }}</p>
                            <b-badge v-for="tag in template.tags" :key="tag" variant="primary" class="mr-1">
                                {{ tag }}
                            </b-badge>
                        </b-list-group-item>
                    </b-list-group>

                    <b-alert v-else show variant="info">
                        {{ isLocalProvider ? $t('template.templatesLocalSession') : $t('template.noTemplates') }}
                    </b-alert>
                </b-col>
            </b-row>
        </template>
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import templateActions from '@/store/actions/template.js';
import tmActions from '@/store/actions/threatmodel.js';
import schema from '@/service/schema/ajv.js';

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
            contentRepoStatus: 'contentRepoStatus',
            canInitializeRepo: 'canInitializeRepo',
            contentRepoName: 'contentRepoName'
        }),
        providerType() {
            return this.$route.name.replace('TemplateGallery', '');
        },
        isLocalProvider() {
            return this.providerType === 'local' || this.providerType === 'desktop';
        }
    },
    mounted() {
        this.$store.dispatch(templateActions.clear);

        // Only fetch templates for git providers (requires authentication)
        // Local/desktop providers use file picker only
        if (!this.isLocalProvider) {
            this.$store.dispatch(templateActions.fetchAll)
                .catch(error => {
                    console.error('Failed to load templates:', error);
                    this.$toast.error(this.$t('template.errors.loadFailed'));
                });
        }
    },
    methods: {
        async onImportFromLocal() {
        if ('showOpenFilePicker' in window) {
            let templateData;

            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Template Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });

                const file = await handle.getFile();
                const text = await file.text();

                // Check for JSON syntax errors
                try {
                    templateData = JSON.parse(text);
                } catch (e) {
                    this.$toast.error(this.$t('template.errors.invalidJson'));
                    console.error('JSON parse error:', e);
                    return;
                }

                // Validate template format
                // Schema already validates: templateMetadata, model, and all required fields
                const validation = schema.validateTemplateFormat(templateData);
                if (!validation.valid) {
                    // Log detailed errors for developers
                    console.warn('Template validation failed:', validation.errors);
                    // Show generic message to users
                    this.$toast.error(this.$t('template.errors.invalidTemplate'));
                    return;
                }

                // Extract provider info from route
                const { provider } = this.$route.params;
                const providerType = this.$route.name.replace('TemplateGallery', '');

                // Fork: Different flow for local/desktop vs git providers
                if (providerType === 'local' || providerType === 'desktop') {
                    // Local/Desktop: Direct load and route (no repo/branch needed)
                    const newTm = await this.$store.dispatch(tmActions.templateLoad, {
                        templateData: templateData.model
                    });

                    const params = Object.assign({}, this.$route.params, {
                        threatmodel: newTm.summary.title
                    });

                    this.$router.push({ name: `${providerType}ThreatModelEdit`, params });
                } else {
                    // Git providers: Store data and navigate through repo/branch selection
                    await this.$store.dispatch(templateActions.setLocalTemplateData, templateData.model);

                    this.$router.push({
                        name: `${providerType}Repository`,
                        params: { provider },
                        query: { action: 'create' }  // Same query param as remote templates
                    });
                }

            } catch (e) {
                // User cancelled - benign
                console.warn('File picker cancelled or error:', e);
            }
        } else {
            this.$toast.error('File picker not supported on this browser');
        }
    },
        async onTemplateClick(template) {
            try {
                // Store template context in Vuex
                await this.$store.dispatch(templateActions.setTemplateContext, template.id);

                // Extract provider from route params
                console.log('Template selected:', this.$route.name);
                const { provider } = this.$route.params;

                // Detect provider type from route name (e.g., 'gitTemplateGallery' → 'git')
                const providerType = this.$route.name.replace('TemplateGallery', '');

                // Route to repository selection
                this.$router.push({
                    name: `${providerType}Repository`,
                    params: { provider },
                    query: { action: 'create' }
                });

            } catch (error) {
                console.error('Error setting template context:', error);
                this.$toast.warning(this.$t('template.errors.loadFailed'));
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