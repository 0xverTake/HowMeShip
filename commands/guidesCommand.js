const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const guidesService = require('../services/guidesService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guides')
        .setDescription('Affiche les guides Star Citizen mis à jour automatiquement')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche les guides par catégorie')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Catégorie de guides')
                        .setRequired(false)
                        .addChoices(
                            { name: '🌟 Guides Débutant', value: 'beginner' },
                            { name: '🚀 Guides Vaisseaux', value: 'ships' },
                            { name: '💰 Commerce & Trading', value: 'trading' },
                            { name: '⚔️ Combat', value: 'combat' },
                            { name: '⛏️ Mining', value: 'mining' },
                            { name: '🔍 Exploration', value: 'exploration' },
                            { name: '📋 Missions', value: 'missions' },
                            { name: '🆕 Mises à jour', value: 'updates' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Recherche un guide spécifique')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Termes de recherche')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('version')
                .setDescription('Affiche la version actuelle du jeu et les guides correspondants'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Affiche les statistiques du service de guides')),

    async execute(interaction, database) {
        const subcommand = interaction.options.getSubcommand();

        try {
            await interaction.deferReply();

            switch (subcommand) {
                case 'list':
                    await this.handleListGuides(interaction);
                    break;
                case 'search':
                    await this.handleSearchGuides(interaction);
                    break;
                case 'version':
                    await this.handleVersionInfo(interaction);
                    break;
                case 'stats':
                    await this.handleStats(interaction);
                    break;
            }

        } catch (error) {
            console.error('Erreur commande guides:', error);
            
            const errorMessage = 'Une erreur est survenue lors de la récupération des guides.';

            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    },

    async handleListGuides(interaction) {
        const category = interaction.options.getString('category');
        
        const result = await guidesService.createGuidesEmbed(category, 15);
        
        // Créer un menu de sélection pour changer de catégorie
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('guides_category_select')
            .setPlaceholder('Choisir une autre catégorie...')
            .addOptions([
                {
                    label: 'Tous les guides',
                    description: 'Afficher tous les guides disponibles',
                    value: 'all',
                    emoji: '📚'
                },
                {
                    label: 'Guides Débutant',
                    description: 'Guides pour les nouveaux joueurs',
                    value: 'beginner',
                    emoji: '🌟'
                },
                {
                    label: 'Guides Vaisseaux',
                    description: 'Guides sur les vaisseaux et le pilotage',
                    value: 'ships',
                    emoji: '🚀'
                },
                {
                    label: 'Commerce & Trading',
                    description: 'Guides de commerce et économie',
                    value: 'trading',
                    emoji: '💰'
                },
                {
                    label: 'Combat',
                    description: 'Guides de combat et PvP',
                    value: 'combat',
                    emoji: '⚔️'
                },
                {
                    label: 'Mining',
                    description: 'Guides de minage et raffinage',
                    value: 'mining',
                    emoji: '⛏️'
                },
                {
                    label: 'Exploration',
                    description: 'Guides d\'exploration et scan',
                    value: 'exploration',
                    emoji: '🔍'
                },
                {
                    label: 'Missions',
                    description: 'Guides des missions et contrats',
                    value: 'missions',
                    emoji: '📋'
                },
                {
                    label: 'Mises à jour',
                    description: 'Guides des nouvelles versions',
                    value: 'updates',
                    emoji: '🆕'
                }
            ]);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            ...result,
            components: [actionRow]
        });
    },

    async handleSearchGuides(interaction) {
        const query = interaction.options.getString('query');
        
        const results = await guidesService.searchGuide(query);
        
        if (results.length === 0) {
            await interaction.editReply({
                content: `❌ Aucun guide trouvé pour "${query}". Essayez des termes différents ou utilisez \`/guides list\` pour voir toutes les catégories.`
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#00b4d8')
            .setTitle(`🔍 Résultats de recherche: "${query}"`)
            .setDescription(`**${results.length}** guide(s) trouvé(s)`)
            .setTimestamp();

        results.slice(0, 10).forEach((guide, index) => {
            const categoryIcon = guidesService.guideCategories[guide.category]?.icon || '📄';
            
            embed.addFields({
                name: `${index + 1}. ${categoryIcon} ${guide.title}`,
                value: `${guide.snippet.substring(0, 100)}...\n[📖 Lire le guide](${guide.url}) • Source: ${guide.source}`,
                inline: false
            });
        });

        if (results.length > 10) {
            embed.setFooter({ text: `Affichage des 10 premiers résultats sur ${results.length}` });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleVersionInfo(interaction) {
        const currentVersion = await guidesService.getCurrentGameVersion();
        
        const embed = new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('🎮 Version actuelle de Star Citizen')
            .addFields(
                { name: '🆕 Version détectée', value: `**Alpha ${currentVersion}**`, inline: true },
                { name: '📚 Guides disponibles', value: 'Mis à jour automatiquement', inline: true },
                { name: '🔄 Dernière vérification', value: new Date().toLocaleString('fr-FR'), inline: true }
            )
            .setDescription(`Les guides sont automatiquement mis à jour pour la version **${currentVersion}**. Le bot détecte les nouvelles versions et adapte le contenu en conséquence.`)
            .setTimestamp();

        // Récupérer quelques guides spécifiques à cette version
        const versionGuides = await guidesService.getWikiGuides('updates', currentVersion);
        
        if (versionGuides.length > 0) {
            const guidesList = versionGuides.slice(0, 3).map(guide => 
                `• [${guide.title}](${guide.url})`
            ).join('\n');

            embed.addFields({
                name: `📋 Guides pour la version ${currentVersion}`,
                value: guidesList,
                inline: false
            });
        }

        embed.addFields({
            name: '💡 Comment ça marche ?',
            value: `• Le bot vérifie automatiquement la version sur [Star Citizen Tools](https://starcitizen.tools/)\n• Les guides sont filtrés par version\n• Le cache est mis à jour toutes les 30 minutes\n• Utilisez \`/guides list updates\` pour voir tous les guides de mise à jour`,
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStats(interaction) {
        const stats = guidesService.getStats();
        
        const embed = new EmbedBuilder()
            .setColor('#6c5ce7')
            .setTitle('📊 Statistiques du Service de Guides')
            .addFields(
                { name: '💾 Cache', value: `${stats.cacheSize} entrée(s)`, inline: true },
                { name: '📂 Catégories', value: stats.categories.toString(), inline: true },
                { name: '🔗 Sources', value: stats.sources.join(', '), inline: true },
                { name: '🔄 Dernière mise à jour', value: new Date(stats.lastUpdate).toLocaleString('fr-FR'), inline: false }
            )
            .setDescription('Statistiques en temps réel du service de guides Star Citizen')
            .setTimestamp();

        embed.addFields({
            name: '⚙️ Fonctionnement',
            value: `• **Détection automatique** de la version du jeu\n• **Cache intelligent** pour les performances\n• **Mise à jour automatique** du contenu\n• **Sources multiples** : Wiki officiel + Communauté`,
            inline: false
        });

        embed.addFields({
            name: '🔄 Fréquence de mise à jour',
            value: `• **Version du jeu** : Détectée à chaque requête\n• **Cache des guides** : 30 minutes\n• **Nettoyage automatique** : Toutes les heures`,
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    },

    // Gestion du menu de sélection de catégorie
    async handleSelectMenu(interaction) {
        if (interaction.customId === 'guides_category_select') {
            try {
                await interaction.deferUpdate();
                
                const selectedCategory = interaction.values[0];
                const category = selectedCategory === 'all' ? null : selectedCategory;
                
                const result = await guidesService.createGuidesEmbed(category, 15);
                
                // Recréer le menu avec la sélection mise à jour
                const selectMenu = StringSelectMenuBuilder.from(interaction.message.components[0].components[0]);
                
                const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                
                await interaction.editReply({
                    ...result,
                    components: [actionRow]
                });
                
                return true;
            } catch (error) {
                console.error('Erreur menu guides:', error);
                return false;
            }
        }
        return false;
    }
};
