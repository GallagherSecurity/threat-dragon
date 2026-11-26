const resolvedStatuses = ['Implemented', 'Not Applicable'];

export const computeMandatory = (mitigation, requiredStandards = []) => {
    if (!requiredStandards.length) return false;
    if (!mitigation.clauses || !mitigation.clauses.length) return false;
    if (resolvedStatuses.includes(mitigation.status)) return false;
    return mitigation.clauses.some(c => c.standard && requiredStandards.includes(c.standard));
};

export const recomputeAllMandatory = (model) => {
    const requiredStandards = model.summary.requiredStandards || [];
    (model.detail.diagrams || []).forEach(diagram => {
        (diagram.cells || []).forEach(cell => {
            ((cell.data && cell.data.threats) || []).forEach(threat => {
                (threat.mitigations || []).forEach(mitigation => {
                    mitigation.mandatory = computeMandatory(mitigation, requiredStandards);
                });
            });
        });
    });
};
