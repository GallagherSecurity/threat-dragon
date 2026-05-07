import assumptions from '../assumptions';
import controls from './controls';
import personas from './personas';
import risks from './risks';

const merge = (model) => {
    let tdThreats = new Array();

    model.threats?.forEach((threat) => {
        let description = threat.description;

        // threat.event is a value required by the schema
        description += '\nOn event : ' + threat.event;

        if (threat.attack_mechanisms) {
            let mechanisms = threat.attack_mechanisms;
            description += '\nUsing attack mechanism : ';
            mechanisms.forEach((mechanism) => {
                description += '\n' + ' CAPEC-' + mechanism.capec_id + ' : ' + mechanism.capec_title;
            });
        }

        if (threat.weaknesses) {
            let weaknesses = threat.weaknesses;
            description += '\nExploiting weakness : ';
            weaknesses.forEach((weakness) => {
                description += '\n' + ' CWE-' + weakness.cwe_id + ' : ' + weakness.cwe_title;
            });
        }

        // sources is a required key
        description += '\nExample attack vectors from :';
        for (let source of threat.sources) {
            description += '\n- ' + source.replaceAll('_', ' ');
        }

        // threat.threat_persona is a value required by the schema
        description += '\n' + personas.merge(model, threat.threat_persona);

        tdThreats.push({
            status: 'Open',
            severity: 'TBD',
            description: description,
            title: threat.title,
            type: 'Generic',
            mitigation: '',
            modelType: 'Generic',
            id: threat.symbolic_name,
            components_affected: threat.components_affected
        });
    });

    tdThreats = controls.merge(model, tdThreats);
    tdThreats = assumptions.merge(model, tdThreats);
    tdThreats = risks.merge(model, tdThreats);

    return tdThreats;
};

export default {
    merge
};
