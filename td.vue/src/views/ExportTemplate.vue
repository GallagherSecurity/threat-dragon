<template>
    <b-row>
        <b-col v-if="model && model.summary">
            <b-card :header="$t('template.exportTemplate')" id="parent-card">
                <b-form @submit.prevent="onDownloadClick">

                    <b-form-row>
                        <b-col>
                            <b-form-group 
                                id="name-group" 
                                :label="$t('template.name')" 
                                label-for="name">
                                <b-form-input 
                                    id="name" 
                                    v-model="templateName"
                                    type="text" 
                                    required
                                ></b-form-input>
                            </b-form-group>
                        </b-col>
                    </b-form-row>

                    <b-form-row>
                        <b-col>
                            <b-form-group 
                                id="description-group" 
                                :label="$t('template.description')"
                                label-for="description">
                                <b-form-textarea 
                                    id="description" 
                                    v-model="templateDescription"
                                    type="text"
                                ></b-form-textarea>
                            </b-form-group>
                        </b-col>
                    </b-form-row>

                    <b-form-row>
                        <b-col>
                            <b-form-group 
                                id="tags-group" 
                                :label="$t('template.tags')" 
                                label-for="tags">
                                <b-form-tags 
                                    id="template-tags" 
                                    :placeholder="$t('template.tagsPlaceholder')"
                                    v-model="templateTags"
                                    variant="primary" 
                                    separator=",;"
                                    tag-class="mx-2"
                                ></b-form-tags>
                            </b-form-group>
                        </b-col>
                    </b-form-row>

                    <b-form-row>
                        <b-col class="text-right mt-5">
                            <b-btn-group>
                                <td-form-button 
                                    id="td-save-btn" 
                                    :isPrimary="true" 
                                    :onBtnClick="onSaveClick" 
                                    icon="save"
                                    :text="$t('template.saveTemplate')" 
                                />
                                <td-form-button 
                                    id="td-cancel-btn" 
                                    :onBtnClick="onCancelClick" 
                                    icon="times"
                                    :text="$t('forms.cancel')" 
                                />
                            </b-btn-group>
                        </b-col>
                    </b-form-row>

                </b-form>
            </b-card>
        </b-col>
    </b-row>
</template>

<script>
import { mapState } from 'vuex';
import { getProviderType } from '@/service/provider/providers.js';
import TdFormButton from '@/components/FormButton.vue';
import tmActions from '@/store/actions/threatmodel.js';

export default {
    name: 'ExportTemplate',
    components: {
        TdFormButton
    },
    data() {
        return {
            templateName: '',
            templateDescription: '',
            templateTags: []
        };
    },
    computed: {
        ...mapState({
            model: (state) => state.threatmodel.data,
            providerType: (state) => getProviderType(state.provider.selected)
        })
    },
    mounted() {
        // Pre-fill with model data
        if (this.model && this.model.summary) {
            this.templateName = this.model.summary.title || '';
            this.templateDescription = this.model.summary.description || '';
        }
    },
    methods: {
        async onSaveClick(evt) {
            evt.preventDefault();
            
            const templateMetadata = {
                name: this.templateName,
                description: this.templateDescription,
                tags: this.templateTags
            };
            
            await this.$store.dispatch(tmActions.templateDownload, templateMetadata);
            
           
            // Navigate back to threat model view
            this.$router.push({ 
                name: `${this.providerType}ThreatModel`, 
                params: this.$route.params 
            });
        },
        onCancelClick(evt) {
            evt.preventDefault();
            this.$router.push({ 
                name: `${this.providerType}ThreatModel`, 
                params: this.$route.params 
            });
        }
    }
};
</script>