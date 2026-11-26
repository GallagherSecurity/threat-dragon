import { createHash, randomUUID } from 'crypto';

import { computeMitigationHash } from './mitigationCatalogueController.js';
import { resolveStandardsAsync } from './standardsController.js';

const BRIEF_DESCRIPTION_LENGTH = 150;

export const computeBriefDescription = (description) => {
    if (!description) {return '';}
    return description.length > BRIEF_DESCRIPTION_LENGTH
        ? description.slice(0, BRIEF_DESCRIPTION_LENGTH) + '...'
        : description;
};

export const computeThreatHash = (threat) => {
    const normalized = [
        (threat.modelType || '').trim().toLowerCase(),
        (threat.type || '').trim().toLowerCase(),
        (threat.title || '').trim().toLowerCase(),
        (threat.description || '').trim().toLowerCase()
    ].join('::');
    return createHash('sha256').update(normalized).
        digest('hex');
};

// Converts a threat object into the format stored in the catalogue index
export const toCatalogueEntry = ({ id, description, ...metadata }, mitigationRefs) => ({
    id,
    hash: computeThreatHash({ description, ...metadata }),
    briefDescription: computeBriefDescription(description),
    ...metadata,
    description,
    mitigationRefs
});

const toNewMitigation = ({ title, description, status, clauses }, id, hash) => ({
    id, hash, briefDescription: computeBriefDescription(description), title, description, status, clauses: clauses || []
});

// Assigns catalogue IDs to mitigations, creating new IDs for those not already in the catalogue
const assignMitigationIds = (threats, existingIdsByHash) => {
    const mitigationIdsByHash = new Map(existingIdsByHash);
    const mitigationsToCreate = [];
    for (const mitigation of threats.flatMap((t) => t.mitigations || [])) {
        const hash = computeMitigationHash(mitigation);
        if (!mitigationIdsByHash.has(hash)) {
            const id = randomUUID();
            mitigationIdsByHash.set(hash, id);
            mitigationsToCreate.push(toNewMitigation(mitigation, id, hash));
        }
    }
    return { mitigationIdsByHash, mitigationsToCreate };
};

const lookupMitigationRefs = (mitigations, mitigationIdsByHash) => [...new Set((mitigations || []).map((m) => mitigationIdsByHash.get(computeMitigationHash(m))))];

// drops threats already in the catalogue as well as repeats within the library itself
const removeDuplicateThreats = (threatLibrary, existingHashes) => {
    const seenHashes = new Set(existingHashes);
    return threatLibrary.filter((threat) => {
        const hash = computeThreatHash(threat);
        const isNew = !seenHashes.has(hash);
        seenHashes.add(hash);
        return isNew;
    });
};

// skipped threats only ever gain links, so threats that lost mitigations are repaired
const linkExistingThreats = (threatLibrary, existingThreats, mitigationIdsByHash) => {
    const existingByHash = new Map(existingThreats.map((t) => [t.hash, t]));
    const refsByThreatId = {};
    for (const libraryThreat of threatLibrary) {
        const entry = existingByHash.get(computeThreatHash(libraryThreat));
        if (entry) {
            const currentRefs = refsByThreatId[entry.id] || entry.mitigationRefs || [];
            const mergedRefs = [...new Set([...currentRefs, ...lookupMitigationRefs(libraryThreat.mitigations, mitigationIdsByHash)])];
            if (mergedRefs.length > currentRefs.length) {
                refsByThreatId[entry.id] = mergedRefs;
            }
        }
    }
    return refsByThreatId;
};

const saveNewMitigationsAsync = async (repository, accessToken, catalogueStatus, mitigationsToCreate) => {
    if (mitigationsToCreate.length === 0) {
        return { mitigationsCreated: 0, standardsCreated: 0 };
    }
    if (catalogueStatus === 'NOT_INITIALIZED') {
        await repository.initializeMitigationCatalogueAsync(accessToken);
    }
    const { mitigations: resolvedMitigations, standardsCreated } =
        await resolveStandardsAsync(repository, accessToken, mitigationsToCreate);
    await repository.bulkSaveMitigationsAsync(accessToken, resolvedMitigations);
    return { mitigationsCreated: resolvedMitigations.length, standardsCreated };
};

export const importThreatLibraryAsync = async (repository, accessToken, threatLibrary) => {
    const { threats: existing } = await repository.listThreatsAsync(accessToken);
    const mitigationCatalogue = await repository.listMitigationsAsync(accessToken);
    const newThreats = removeDuplicateThreats(threatLibrary, existing.map((t) => t.hash));
    const existingMitigationIds = new Map(mitigationCatalogue.mitigations.map((m) => [m.hash, m.id]));
    // every library threat counts, so mitigations missing from the catalogue come back even when their threat is skipped
    const { mitigationIdsByHash, mitigationsToCreate } = assignMitigationIds(threatLibrary, existingMitigationIds);
    const toCreate = newThreats.map(({ mitigations, ...threat }) => toCatalogueEntry(threat, lookupMitigationRefs(mitigations, mitigationIdsByHash)));
    const refsByThreatId = linkExistingThreats(threatLibrary, existing, mitigationIdsByHash);

    const { mitigationsCreated, standardsCreated } =
        await saveNewMitigationsAsync(repository, accessToken, mitigationCatalogue.status, mitigationsToCreate);
    if (toCreate.length > 0) {
        await repository.bulkSaveThreatsAsync(accessToken, toCreate);
    }
    await repository.updateThreatMitigationRefsAsync(accessToken, refsByThreatId);

    return {
        created: toCreate.length,
        skipped: threatLibrary.length - newThreats.length,
        threatsLinked: Object.keys(refsByThreatId).length,
        mitigationsCreated,
        standardsCreated
    };
};
