TEMPLATE_FETCH_ALL      // Fetch list from API
TEMPLATE_FETCH_BY_ID    // Fetch single template content
TEMPLATE_SELECTED       // Track which card user clicked
TEMPLATE_CLEAR          // Clear template state

// Admin only
TEMPLATE_CREATE         // Import template (admin)
TEMPLATE_UPDATE         // Edit metadata (admin)
TEMPLATE_DELETE         // Delete template (admin)

export default {
    clear: TEMPLATE_CLEAR,
    selected: TEMPLATE_SELECTED,
    fetchAll: TEMPLATE_FETCH_ALL,
    fetchById: TEMPLATE_FETCH_BY_ID,
    create: TEMPLATE_CREATE,
    update: TEMPLATE_UPDATE,
    delete: TEMPLATE_DELETE
    

};
