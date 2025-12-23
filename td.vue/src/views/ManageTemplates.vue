<template>
    <b-container fluid>
        <b-row>
            <b-col>
                <b-jumbotron class="text-center">
                    <h4>{{ $t('template.manage') }}</h4>
                    <p class="lead">{{ $t('template.manageDescription') }}</p>
                </b-jumbotron>
            </b-col>
        </b-row>


        <b-row>
            <b-col md="6" offset-md="3">
                <b-form-group>
                    <b-input-group>
                        <b-input-group-prepend>
                            <b-button variant="primary" @click="onAddTemplateClick" id="add-template-btn" class="mr-3">
                                <font-awesome-icon icon="plus" class="mr-2"></font-awesome-icon>
                                {{ $t('template.addNew') }}
                            </b-button>
                        </b-input-group-prepend>
                        <b-form-input v-model="searchQuery" :placeholder="$t('template.search')"
                            @input="onSearchChange" />
                    </b-input-group>
                </b-form-group>
            </b-col>
        </b-row>
       

        <!-- Template list -->
        <b-row >
            <b-col md="6" offset-md="3">
                <b-list-group v-if="templates.length > 0">
                    <b-list-group-item v-for="template in templates" :key="template.id" :data-template-id="template.id"
                        class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5>{{ template.name }}</h5>
                            <p class="mb-1 text-muted">{{ template.description }}</p>
                            <b-badge v-for="tag in template.tags" :key="tag" variant="primary" class="mr-1">
                                {{ tag }}
                            </b-badge>
                        </div>

                        <!-- Burger menu -->
                        <b-dropdown right variant="link" class="template-actions">
                            <template #button-content>
                                <font-awesome-icon icon="ellipsis-v"></font-awesome-icon>
                            </template>
                            <b-dropdown-item @click="onEditTemplate(template)">
                                <font-awesome-icon icon="edit" class="mr-2"></font-awesome-icon>
                                {{ $t('forms.edit') }}
                            </b-dropdown-item>
                            <b-dropdown-divider></b-dropdown-divider>
                            <b-dropdown-item @click="onDeleteTemplate(template)" variant="danger">
                                <font-awesome-icon icon="trash" class="mr-2"></font-awesome-icon>
                                {{ $t('forms.delete') }}
                            </b-dropdown-item>
                        </b-dropdown>
                    </b-list-group-item>
                </b-list-group>

                <b-alert v-else show variant="info">
                    {{ $t('template.noTemplates') }}
                </b-alert>
            </b-col>
        </b-row>
        <b-modal id="edit-template-modal" title="Edit Template" @ok="onSaveEdit" @cancel="onCancelEdit">
            <b-form>
                <b-form-group label="Template Name" label-for="edit-name">
                    <b-form-input id="edit-name" v-model="editForm.name" required></b-form-input>
                </b-form-group>

                <b-form-group label="Description" label-for="edit-description">
                    <b-form-textarea id="edit-description" v-model="editForm.description" rows="3"></b-form-textarea>
                </b-form-group>

                <b-form-group label="Tags" label-for="edit-tags">
                    <b-form-tags id="edit-tags" v-model="editForm.tags" placeholder="Add tags..."
                        separator=",;"></b-form-tags>
                </b-form-group>
            </b-form>
        </b-modal>
    </b-container>
</template>

<script>
import { mapGetters } from 'vuex';
import templateActions from '@/store/actions/template.js';
import schema from '@/service/schema/ajv.js';

export default {
    name: 'TemplateGallery',
    data() {
        return {
            searchQuery: '',
            editingTemplate: null,
            editForm: {
                name: '',
                description: '',
                tags: []
            }
        };
    },
    computed: {
        ...mapGetters({
            templates: 'templates',
        })
    },
    mounted() {
        this.$store.dispatch(templateActions.fetchAll);
    },
    methods: {
        onEditTemplate(template) {
            // Populate the edit form
            this.editingTemplate = template;
            this.editForm.name = template.name;
            this.editForm.description = template.description;
            this.editForm.tags = [...template.tags]; // Copy array

            // Show modal
            this.$bvModal.show('edit-template-modal');
        },

        async onSaveEdit() {
            try {
                await this.$store.dispatch(templateActions.update, {
                    
                    
                        id: this.editingTemplate.id,
                        name: this.editForm.name,
                        description: this.editForm.description,
                        tags: this.editForm.tags,
                        modelRef: this.editingTemplate.modelRef
                 
                });

                this.$toast('Template updated successfully');

                this.$bvModal.hide('edit-template-modal');
            } catch (error) {
                console.error('Error updating template:', error);
                this.$toast('Failed to update template');
            }
        },

        onCancelEdit() {
            this.$bvModal.hide('edit-template-modal');
        },



        async onAddTemplateClick() {
            if ('showOpenFilePicker' in window) {
                try {
                    const [handle] = await window.showOpenFilePicker({
                        types: [{
                            description: 'Template Files',
                            accept: { 'application/json': ['.json'] }
                        }],
                        multiple: false
                    });

                    const file = await handle.getFile();
                    await this.importTemplate(file);

                } catch (e) {
                    // User cancelled - benign
                    console.warn('File picker cancelled');
                }
            } else {
                this.$toast.error('File picker not supported on this browser', {
                    title: 'Error',
                    variant: 'danger',
                    solid: true
                });
            }
        },

        async importTemplate(file) {
            try {
                const text = await file.text();
                const templateData = JSON.parse(text);

                // Validate template format against schema
                const validation = schema.validateTemplateFormat(templateData);
                
                if (!validation.valid) {
                    const errorMessages = validation.errors.map(err => 
                        `${err.instancePath || 'root'}: ${err.message}`
                    ).join(', ');
                    throw new Error(`Template validation failed: ${errorMessages}`);
                }

                // Verify template structure
                if (!templateData.templateMetadata || !templateData.model) {
                    throw new Error('Invalid template format: missing templateMetadata or model');
                }

                const { templateMetadata, model } = templateData;

                // Verify required metadata fields
                if (!templateMetadata.id || !templateMetadata.name || !templateMetadata.description) {
                    throw new Error('Invalid template metadata: missing required fields (id, name, description, )');
                }

                // Split metadata from content and dispatch to store
                await this.$store.dispatch(templateActions.create, {
    template: templateData  // ← Use "template" key, not "templateData"
});

                this.$toast.success('Template imported successfully');

            } catch (error) {
                console.error('Error importing template:', error);
                const errorMessage = error.message || 'Failed to import template';
                this.$toast.error(errorMessage);
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
        },

        async onDeleteTemplate(template) {
            // Confirm before delete
            const confirmed = await this.$bvModal.msgBoxConfirm(
                `Are you sure you want to delete "${template.name}"?`,
                {
                    title: 'Confirm Delete',
                    okVariant: 'danger',
                    okTitle: 'Delete',
                    cancelTitle: 'Cancel',
                    centered: true
                }
            );

            if (confirmed) {
                try {
                    await this.$store.dispatch(templateActions.delete, template.id);
                    this.$toast.success('Template deleted successfully');
                } catch (error) {
                    this.$toast.error('Failed to delete template');
                }
            }

        },
    }
};
</script>
<style scoped>
.template-actions>>>.btn::after,
.template-actions>>>.dropdown-toggle::after {
    display: none !important;
}
</style>