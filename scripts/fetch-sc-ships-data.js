const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_URL = 'https://raw.githubusercontent.com/StarCitizenWiki/scunpacked-data/master';
const OUTPUT_DIR = './data/sc-ships-4.2';
const IMAGES_DIR = './data/sc-ships-4.2/images';

// Créer les dossiers de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Fonction pour télécharger un fichier
function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fonction pour télécharger du JSON
function downloadJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Liste des vaisseaux à partir du repository GitHub
const shipFiles = [
    // Aegis Dynamics
    'aegs_avenger_stalker.json',
    'aegs_avenger_titan.json',
    'aegs_avenger_titan_renegade.json',
    'aegs_avenger_warlock.json',
    'aegs_eclipse.json',
    'aegs_eclipse_bis2950.json',
    'aegs_gladius.json',
    'aegs_gladius_crocodile.json',
    'aegs_gladius_dunlevy.json',
    'aegs_gladius_pir.json',
    'aegs_gladius_valiant.json',
    'aegs_hammerhead.json',
    'aegs_hammerhead_showdown.json',
    'aegs_idris_m.json',
    'aegs_idris_p.json',
    'aegs_idris_p_fw_25.json',
    'aegs_javelin.json',
    'aegs_reclaimer.json',
    'aegs_reclaimer_showdown.json',
    'aegs_redeemer.json',
    'aegs_retaliator.json',
    'aegs_sabre.json',
    'aegs_sabre_comet.json',
    'aegs_sabre_firebird.json',
    'aegs_sabre_firebird_collector_milt.json',
    'aegs_sabre_peregrine.json',
    'aegs_sabre_peregrine_collector_competition.json',
    'aegs_sabre_raven.json',
    'aegs_vanguard.json',
    'aegs_vanguard_harbinger.json',
    'aegs_vanguard_hoplite.json',
    'aegs_vanguard_sentinel.json',
    
    // Anvil Aerospace
    'anvl_arrow.json',
    'anvl_asgard.json',
    'anvl_ballista.json',
    'anvl_ballista_dunestalker.json',
    'anvl_ballista_snowblind.json',
    'anvl_c8_pisces.json',
    'anvl_c8r_pisces.json',
    'anvl_c8x_pisces_expedition.json',
    'anvl_carrack.json',
    'anvl_carrack_bis2950.json',
    'anvl_carrack_expedition.json',
    'anvl_centurion.json',
    'anvl_gladiator.json',
    'anvl_hawk.json',
    'anvl_hornet_f7_mk2_collector_mod.json',
    'anvl_hornet_f7a_mk1.json',
    'anvl_hornet_f7a_mk2.json',
    'anvl_hornet_f7a_mk2_exec_military.json',
    'anvl_hornet_f7a_mk2_exec_stealth.json',
    'anvl_hornet_f7c.json',
    'anvl_hornet_f7c_mk2.json',
    'anvl_hornet_f7c_wildfire.json',
    'anvl_hornet_f7cm.json',
    'anvl_hornet_f7cm_heartseeker.json',
    'anvl_hornet_f7cm_mk2.json',
    'anvl_hornet_f7cm_mk2_heartseeker.json',
    'anvl_hornet_f7cr.json',
    'anvl_hornet_f7cr_mk2.json',
    'anvl_hornet_f7cs.json',
    'anvl_hornet_f7cs_mk2.json',
    'anvl_hurricane.json',
    'anvl_lightning_f8.json',
    'anvl_lightning_f8c.json',
    'anvl_lightning_f8c_collector_military.json',
    'anvl_lightning_f8c_collector_stealth.json',
    'anvl_lightning_f8c_exec.json',
    'anvl_lightning_f8c_exec_military.json',
    'anvl_lightning_f8c_exec_stealth.json',
    'anvl_lightning_f8c_plat.json',
    'anvl_spartan.json',
    'anvl_terrapin.json',
    'anvl_terrapin_medic.json',
    'anvl_valkyrie.json',
    'anvl_valkyrie_bis2950.json',
    
    // Argo Astronautics
    'argo_atls.json',
    'argo_atls_geo.json',
    'argo_atls_geo_collector_grad01.json',
    'argo_atls_geo_collector_grad02.json',
    'argo_atls_geo_collector_grad03.json',
    'argo_atls_geo_ikti.json',
    'argo_atls_ikti.json',
    'argo_atls_ikti_argos.json',
    'argo_csv_cargo.json',
    'argo_mole.json',
    'argo_mole_carbon.json',
    'argo_mole_talus.json',
    'argo_mpuv.json',
    'argo_mpuv_1t.json',
    'argo_mpuv_transport.json',
    'argo_raft.json',
    'argo_srv.json',
    
    // Banu
    'banu_defender.json',
    
    // Consolidated Outland
    'cnou_hoverquad.json',
    'cnou_mustang_alpha.json',
    'cnou_mustang_alpha_citizencon2018.json',
    'cnou_mustang_beta.json',
    'cnou_mustang_delta.json',
    'cnou_mustang_gamma.json',
    'cnou_mustang_omega.json',
    'cnou_nomad.json',
    
    // Crusader Industries
    'crus_intrepid.json',
    'crus_intrepid_collector_indust.json',
    'crus_spirit_a1.json',
    'crus_spirit_c1.json',
    'crus_spirit_c1_civilian.json',
    'crus_star_runner.json',
    'crus_starfighter_inferno.json',
    'crus_starfighter_ion.json',
    'crus_starlifter_a2.json',
    'crus_starlifter_c2.json',
    'crus_starlifter_m2.json',
    
    // Drake Interplanetary
    'drak_buccaneer.json',
    'drak_caterpillar.json',
    'drak_caterpillar_pirate.json',
    'drak_corsair.json',
    'drak_corsair_exec_military.json',
    'drak_corsair_exec_stealthindustrial.json',
    'drak_cutlass_black.json',
    'drak_cutlass_black_bis2950.json',
    'drak_cutlass_black_exec_military.json',
    'drak_cutlass_black_exec_stealth.json',
    'drak_cutlass_blue.json',
    'drak_cutlass_blue_bis2950.json',
    'drak_cutlass_red.json',
    'drak_cutlass_red_bis2950.json',
    'drak_cutlass_steel.json',
    'drak_cutter.json',
    'drak_cutter_rambler.json',
    'drak_cutter_scout.json',
    'drak_dragonfly.json',
    'drak_dragonfly_pink.json',
    'drak_dragonfly_yellow.json',
    'drak_golem.json',
    'drak_herald.json',
    'drak_mule.json',
    'drak_vulture.json',
    
    // Esperia
    'espr_prowler.json',
    'espr_prowler_utility.json',
    'espr_talon.json',
    'espr_talon_shrike.json',
    
    // Gatac Manufacture
    'gama_syulen.json',
    'gama_syulen_exec_military.json',
    'gama_syulen_exec_stealth.json',
    
    // Greycat Industrial
    'grin_mtc.json',
    'grin_ptv.json',
    'grin_roc.json',
    'grin_roc_ds.json',
    'grin_stv.json',
    
    // Kruger Intergalactic
    'krig_p52_merlin.json',
    'krig_p72_archimedes.json',
    'krig_p72_archimedes_emerald.json',
    
    // MISC
    'misc_fortune.json',
    'misc_fortune_collector_industrial.json',
    'misc_freelancer.json',
    'misc_freelancer_dur.json',
    'misc_freelancer_max.json',
    'misc_freelancer_mis.json',
    'misc_fury.json',
    'misc_fury_lx.json',
    'misc_fury_miru.json',
    'misc_hull_a.json',
    'misc_hull_c.json',
    'misc_prospector.json',
    'misc_razor.json',
    'misc_razor_ex.json',
    'misc_razor_lx.json',
    'misc_reliant.json',
    'misc_reliant_mako.json',
    'misc_reliant_sen.json',
    'misc_reliant_tana.json',
    'misc_starfarer.json',
    'misc_starfarer_gemini.json',
    'misc_starlancer_max.json',
    'misc_starlancer_max_collector_indust.json',
    'misc_starlancer_tac.json',
    
    // Mirai
    'mrai_guardian.json',
    'mrai_guardian_military.json',
    'mrai_guardian_mx.json',
    'mrai_guardian_qi.json',
    'mrai_guardian_qi_collector_indust.json',
    'mrai_pulse.json',
    'mrai_pulse_lx.json',
    
    // Origin Jumpworks
    'orig_100i.json',
    'orig_125a.json',
    'orig_135c.json',
    'orig_300i.json',
    'orig_315p.json',
    'orig_325a.json',
    'orig_350r.json',
    'orig_400i.json',
    'orig_600i.json',
    'orig_600i_bis2951.json',
    'orig_600i_executive_edition.json',
    'orig_600i_touring.json',
    'orig_85x.json',
    'orig_890jump.json',
    'orig_m50.json',
    'orig_x1.json',
    'orig_x1_force.json',
    'orig_x1_velocity.json',
    
    // RSI
    'rsi_aurora_cl.json',
    'rsi_aurora_es.json',
    'rsi_aurora_ln.json',
    'rsi_aurora_lx.json',
    'rsi_aurora_mr.json',
    'rsi_constellation_andromeda.json',
    'rsi_constellation_aquila.json',
    'rsi_constellation_phoenix.json',
    'rsi_constellation_phoenix_emerald.json',
    'rsi_constellation_taurus.json',
    'rsi_constellation_taurus_military.json',
    'rsi_lynx.json',
    'rsi_mantis.json',
    'rsi_polaris.json',
    'rsi_polaris_collector_military.json',
    'rsi_scorpius.json',
    'rsi_scorpius_antares.json',
    'rsi_scorpius_stealth.json',
    'rsi_ursa_medivac.json',
    'rsi_ursa_medivac_stealth.json',
    'rsi_ursa_rover.json',
    'rsi_ursa_rover_emerald.json',
    'rsi_zeus_cl.json',
    'rsi_zeus_cl_collector_indust.json',
    'rsi_zeus_es.json',
    'rsi_zeus_es_collector_indust.json',
    
    // Tumbril Land Systems
    'tmbl_cyclone.json',
    'tmbl_cyclone_aa.json',
    'tmbl_cyclone_mt.json',
    'tmbl_cyclone_rc.json',
    'tmbl_cyclone_rn.json',
    'tmbl_cyclone_tr.json',
    'tmbl_nova.json',
    'tmbl_storm.json',
    'tmbl_storm_aa.json',
    
    // Vanduul
    'vncl_blade.json',
    'vncl_glaive.json',
    'vncl_scythe.json',
    
    // Xi'an
    'xian_nox.json',
    'xian_nox_collector_mod.json',
    'xian_nox_kue.json',
    'xian_scout.json',
    'xnaa_santokyai.json'
];

async function main() {
    console.log('🚀 Début du téléchargement des données Star Citizen 4.2...');
    
    const allShipsData = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const shipFile of shipFiles) {
        try {
            console.log(`📥 Téléchargement: ${shipFile}`);
            const url = `${BASE_URL}/ships/${shipFile}`;
            const shipData = await downloadJSON(url);
            
            // Ajouter des métadonnées
            shipData.sourceFile = shipFile;
            shipData.lastUpdated = new Date().toISOString();
            shipData.version = '4.2.0-LIVE.9873572';
            
            allShipsData.push(shipData);
            successCount++;
            
            // Sauvegarder individuellement
            const outputFile = path.join(OUTPUT_DIR, shipFile);
            fs.writeFileSync(outputFile, JSON.stringify(shipData, null, 2));
            
        } catch (error) {
            console.error(`❌ Erreur pour ${shipFile}:`, error.message);
            errorCount++;
        }
        
        // Petite pause pour éviter de surcharger le serveur
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Créer un fichier consolidé
    const consolidatedData = {
        metadata: {
            version: '4.2.0-LIVE.9873572',
            generatedAt: new Date().toISOString(),
            totalShips: allShipsData.length,
            source: 'https://github.com/StarCitizenWiki/scunpacked-data'
        },
        ships: allShipsData
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'all-ships-4.2.json'),
        JSON.stringify(consolidatedData, null, 2)
    );
    
    // Créer un index simplifié pour les images
    const shipIndex = allShipsData.map(ship => ({
        className: ship.ClassName,
        name: ship.Name,
        manufacturer: ship.Manufacturer?.Name || 'Unknown',
        role: ship.Role,
        career: ship.Career,
        size: ship.Size,
        crew: ship.Crew,
        cargo: ship.Cargo,
        mass: ship.Mass,
        scmSpeed: ship.FlightCharacteristics?.ScmSpeed,
        maxSpeed: ship.FlightCharacteristics?.MaxSpeed,
        health: ship.Health,
        sourceFile: ship.sourceFile
    }));
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'ships-index.json'),
        JSON.stringify(shipIndex, null, 2)
    );
    
    console.log(`\n✅ Téléchargement terminé !`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Succès: ${successCount}`);
    console.log(`   - Erreurs: ${errorCount}`);
    console.log(`   - Total: ${shipFiles.length}`);
    console.log(`\n📁 Fichiers générés:`);
    console.log(`   - ${OUTPUT_DIR}/all-ships-4.2.json (données complètes)`);
    console.log(`   - ${OUTPUT_DIR}/ships-index.json (index simplifié)`);
    console.log(`   - ${OUTPUT_DIR}/*.json (fichiers individuels)`);
    
    // Afficher quelques statistiques
    const manufacturers = [...new Set(allShipsData.map(s => s.Manufacturer?.Name).filter(Boolean))];
    const roles = [...new Set(allShipsData.map(s => s.Role).filter(Boolean))];
    const careers = [...new Set(allShipsData.map(s => s.Career).filter(Boolean))];
    
    console.log(`\n📈 Analyse des données:`);
    console.log(`   - Fabricants: ${manufacturers.length} (${manufacturers.slice(0, 5).join(', ')}...)`);
    console.log(`   - Rôles: ${roles.length} (${roles.slice(0, 5).join(', ')}...)`);
    console.log(`   - Carrières: ${careers.length} (${careers.join(', ')})`);
}

main().catch(console.error);
