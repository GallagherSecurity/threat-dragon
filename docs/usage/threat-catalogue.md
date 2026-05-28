---
layout: page
title: Threat Catalogue
nav_order: 5
path: /usage/threat-catalogue
group: Modeling
---

## Using the Threat Catalogue

[Threat Dragon](https://owasp.org/www-project-threat-dragon/) supports a shared threat catalogue
that allows organisations to build and maintain a library of reusable threats.
Threats in the catalogue can be added directly to diagrams, ensuring consistency across threat models.

![Threat Catalogue Button]({{ '/assets/images/threat-catalogue.png'
 | relative_url }}){: style="max-width: 700px; width: 100%;" }


**Note**: The threat catalogue is currently available for GitHub repositories only.
Support for Atlassian Bitbucket, GitLab and Google Drive is coming in future releases.

## Adding Threats from the Catalogue to a Diagram

When editing a diagram, you can add threats directly from the organisation's threat catalogue
rather than creating them from scratch.

1. Select an element on the diagram (process, data store, data flow, or actor)
2. Click the **New Threat from Catalogue** button in the threat panel
3. The threat catalogue selector will open, showing threats relevant to your diagram type and selected element 
4. Browse or search for threats using the search bar
5. Threats are grouped by type — click a group heading to expand it
6. Click one or more threats to select them (a checkmark will appear on selected threats)
7. Click **Add selected to model** to add all selected threats to the element

**Note**: The catalogue automatically filters threats to only show those matching your diagram's
framework (e.g. STRIDE, LINDDUN) and the type of element you have selected.
Threats that do not apply to your context will not be shown.

![Threat catalogue selector]({{ '/assets/images/threat-catalogue-selector.png'
 | relative_url }}){:style="max-width: 500px; width: 100%;" }

## Managing the Threat Catalogue (Administrators)

Users with **push** or **admin** permissions on the content repository (`GITHUB_CONTENT_REPO`)
are considered administrators and can manage the organisation's shared threat catalogue.

Administrators will see a **cog icon** in the navigation bar.
Clicking the cog reveals a dropdown menu with a **Manage Threat Catalogue** option,
which takes you to the Manage Threat Catalogue page where you can add, edit, import, export and delete threats.

![Manage Threat Catalogue]({{ '/assets/images/manage-threat-catalogue.png'
 | relative_url }}){: style="max-width: 400px; width: 100%;" }

### Bootstrapping the Threat Catalogue

Before the catalogue can be used, an administrator must initialise it.
This creates the necessary folder and metadata file in the content repository.

1. Authenticate with Threat Dragon using an github identity that has admin access to the content repository
2. Navigate to the Manage Threat Catalogue page
3. Click the **Initialise Catalogue** button
4. The repository will be set up automatically


This creates the `threats/` directory and `threat_catalogue.json` metadata file in the content repository.
Bootstrapping only needs to be done once per repository.

![Initialise Threat Catalogue]({{ '/assets/images/initialise-threat-catalogue.png' 
 | relative_url }}){: style="max-width: 600px; width: 100%;" }

### Adding a Threat

Administrators can add individual threats to the catalogue.

1. Navigate to the Manage Threat Catalogue page
2. Click the **Add Threat** button
3. Fill in the threat details:
   - **Title** — a short, descriptive name for the threat (required)
   - **Framework** — the threat modelling framework this threat belongs to, e.g. STRIDE, LINDDUN (required)
   - **Type** — the threat category within the chosen framework, e.g. Spoofing, Tampering (required)
   - **Severity** — the default severity level: TBD, Low, Medium, High or Critical
   - **Score** — an optional risk score
   - **Description** — a detailed explanation of the threat
   - **Mitigations** — recommended remediations or controls
   - **Tags** — optional labels for easier searching and filtering
4. Click **Apply** to save the threat to the catalogue

### Editing a Threat

Administrators can update the details of any existing threat in the catalogue.

1. Navigate to the Manage Threat Catalogue page
2. Find the threat you want to update and use the search bar or framework/type filters if needed
3. Click the kebab menu (⋮) on the threat and select **Edit**
4. Modify any of the threat fields as needed
5. Click **Apply** to save your changes

**Note**: Editing a threat in the catalogue does not affect any threats that have already been
added to existing threat models from the catalogue. Changes only apply to future uses.

### Deleting a Threat

Administrators can delete individual threats from the catalogue.

1. Navigate to the Manage Threat Catalogue page
2. Find the threat you want to delete
3. Click the kebab menu (⋮) on the threat and select **Delete**
4. Confirm the deletion

**Warning**: Deleting a threat cannot be undone. Threats that have already been added to
existing threat models are not affected.



### Bulk Deleting Threats

Administrators can delete multiple threats at once using the bulk delete feature.

1. Navigate to the Manage Threat Catalogue page
2. Use the checkboxes on the left of each threat to select the threats you want to delete
   - Optionally use the search bar or framework/type filters to narrow down the list first
   - Click **Select All** to select all threats visible on the current page
3. Use the **per page** control at the bottom to adjust how many threats are shown per page —
   this affects how many threats **Select All** will select at once
4. Click the **Delete Selected** button
5. Confirm the deletion

**Note**: **Select All** only selects threats on the currently visible page. If your catalogue
spans multiple pages, repeat the selection and deletion for each page, or increase the per page
size to select more threats at once.

**Warning**: Bulk deletion cannot be undone. Threats that have already been added to
existing threat models are not affected.

![Bulk Delete Threats]({{ '/assets/images/bulk-delete.png' 
 | relative_url }}){: style="max-width: 600px; width: 100%;" }

### Importing a Threat Library

Administrators can bulk import threats into the catalogue from a threat library JSON file.
This is useful for seeding the catalogue with a pre-built set of threats or migrating threats from another instance.

1. Navigate to the Manage Threat Catalogue page
2. Click the **Import Threats** button
3. Select a threat library `.json` file from your local filesystem
4. Threat Dragon will validate the file format and import all threats

A summary will be shown indicating how many threats were added and how many were skipped.

**Duplicate threats are not permitted**  if a threat in the import file is identical to one already
in the catalogue, it will be skipped automatically. This means you can safely re-import a library
file without creating duplicates. Only net-new threats will be added.



Threat library files use a different schema to standard threat model files and are not interchangeable.
The easiest way to obtain a valid file is to export threats from an existing catalogue using the **Export Selected** feature.

### Exporting Threats

Administrators can export a selection of threats from the catalogue as a threat library JSON file.
This is useful for sharing threats with other teams, backing up the catalogue, or migrating to another instance.

1. Navigate to the Manage Threat Catalogue page
2. Use the checkboxes to select the threats you want to export
   - Use filters and search to narrow down the list before selecting
   - Use **Select All** to select all threats on the current page
3. Click the **Export Selected** button
4. A threat library `.json` file will be downloaded to your local filesystem



### Searching and Filtering

![Filter Threats]({{ '/assets/images/filtering-threats.png' 
 | relative_url }}){: style="max-width: 800px; width: 100%;" }

The Manage Threat Catalogue page provides search and filter controls to help you find threats quickly,
which is especially useful when the catalogue grows large.

- **Search** — type in the search bar to filter threats by title, description or tag
- **Framework filter** — narrow the list to threats belonging to a specific framework (e.g. STRIDE, LINDDUN)
- **Type filter** — once a framework is selected, further filter by threat type (e.g. Spoofing, Tampering)
- **Clear filters** — click the ✕ button to reset all active filters at once
- **Per page** — use the per page control at the bottom to set how many threats are shown per page (10, 25, 50 or 100)

The list shows how many threats match the current filters out of the total in the catalogue.
Selections made with checkboxes are preserved across filter changes, so you can build up a selection
across multiple searches before exporting or deleting.

