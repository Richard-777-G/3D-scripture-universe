# Resource directory audit

Audit of the 137-item *Scripture Universe Master Directory* PDF (Nov 2026), checked on 2026-11-06.

**How it was checked:** every GitHub repository was cloned (`git clone --depth 1 --filter=blob:none`) and its licence file or README licence section read. Non-GitHub sites were assessed from their published terms and are marked *verify* where not confirmed.

**Findings:**
- All 89 GitHub repositories listed exist.
- The PDF does not state licences. About a quarter of entries are non-commercial, copyleft, unlicensed or image-copyrighted. Those are listed below so they are not imported by mistake.
- The PDF describes the old single-file v16 app (`D.fv`, `D.tv`). The app is now the Vite + TypeScript build; map its suggestions to the current code.
- Counts in the PDF (e.g. edge totals) are claims, not checked facts. Re-derive any number from the downloaded data.

**Rule:** nothing from this list enters `data/` unless it is pinned in the sources lock file with a checksum, its licence is recorded, and it appears on the Credits screen.


## Tier 1 · Use next (high value, clean licence)

Bring in through the pinned, checksummed pipeline with Credits entries.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 025 | openbibleinfo/Bible-Geocoding-Data | [openbibleinfo/Bible-Geocoding-Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) | CC BY | 2021-10-31 |
| 027 | ubsicap/ubs-open-license (UBS Project MARBLE Bible Routes) | [ubsicap/ubs-open-license](https://github.com/ubsicap/ubs-open-license) | CC BY-SA | 2026-10-21 |
| 094 | STEPBible Data | [STEPBible/STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) | CC BY 4.0 | 2026-11-02 |
| 095 | Clear-Bible MACULA Hebrew Syntax Trees (Clear-Bible/macula-hebrew) | [Clear-Bible/macula-hebrew](https://github.com/Clear-Bible/macula-hebrew) | CC BY | 2026-04-24 |
| 096 | Clear-Bible MACULA Greek Syntax Trees (Clear-Bible/macula-greek) | [Clear-Bible/macula-greek](https://github.com/Clear-Bible/macula-greek) | CC BY | 2026-07-07 |
| 014 | Clear-Bible/speaker-quotations | [Clear-Bible/speaker-quotations](https://github.com/Clear-Bible/speaker-quotations) | CC BY | 2024-03-27 |
| 015 | Clear-Bible/Alignments | [Clear-Bible/Alignments](https://github.com/Clear-Bible/Alignments) | CC BY | 2026-05-11 |
| 122 | Bible Passage Reference Parser (openbibleinfo/Bible-Passage-Reference-Parser) | [openbibleinfo/Bible-Passage-Reference-Parser](https://github.com/openbibleinfo/Bible-Passage-Reference-Parser) | MIT | 2026-10-17 |
| 049 | nvkelso/natural-earth-vector (Natural Earth Vector & Raster Data) | [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) | Public domain | 2022-06-02 |
| 031 | isawnyu/pleiades.datasets (Pleiades GIS & JSON Exports) | [isawnyu/pleiades.datasets](https://github.com/isawnyu/pleiades.datasets) | CC BY 3.0 | 2026-11-06 |
| 032 | Pleiades Gazetteer of the Ancient World – Official Data Downloads | [link](https://pleiades.stoa.org/downloads) | CC BY 3.0 |  |
| 043 | Ancient World Mapping Center (AWMC) Geodata Repository | [AWMC/geodata](https://github.com/AWMC/geodata) | ODbL | 2024-04-22 |
| 065 | metmuseum/openaccess (Metropolitan Museum of Art Open Access Dataset & API) | [metmuseum/openaccess](https://github.com/metmuseum/openaccess) | CC0 | 2026-11-02 |
| 103 | Dodson Greek-English Lexicon (biblicalhumanities/Dodson-Greek-Lexicon) | [biblicalhumanities/Dodson-Greek-Lexicon](https://github.com/biblicalhumanities/Dodson-Greek-Lexicon) | CC0 | 2018-01-11 |
| 077 | OpenScriptures Hebrew Bible (openscriptures/morphhb) | [openscriptures/morphhb](https://github.com/openscriptures/morphhb) | CC BY | 2024-08-27 |
| 080 | Unicode/XML Leningrad Codex | [link](https://tanach.us) | public domain |  |
| 085 | SBL Greek New Testament (LogosBible/SBLGNT) | [LogosBible/SBLGNT](https://github.com/LogosBible/SBLGNT) | CC BY | 2026-10-24 |
| 011 | bradystephenson/bible-data | [bradystephenson/bible-data](https://github.com/bradystephenson/bible-data) | CC BY | 2026-10-03 |
| 059 | Papyri.info / Duke Databank of Documentary Papyri (DDbDP) | [link](https://papyri.info/docs/ddbdp) | CC BY |  |
| 068 | Open Context (Alexandria Archive Institute) | [link](https://opencontext.org/about/recipes) | mostly CC BY |  |
| 026 | OpenBible.info Bible Geocoding Portal | [link](https://www.openbible.info/geo/) | CC BY |  |

## Tier 2 · Already in the app

Keep; refresh from source when it updates.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 001 | OpenBible.info Bible Cross References Dataset | [link](https://www.openbible.info/labs/cross-references/) | CC BY |  |
| 009 | robertrouse/theographic-bible-metadata | [robertrouse/theographic-bible-metadata](https://github.com/robertrouse/theographic-bible-metadata) | CC BY-SA | 2026-11-02 |
| 010 | Viz.Bible Open Data Portal | [link](https://viz.bible/bible-data/) | CC BY-SA |  |
| 003 | scrollmapper/bible_databases | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) | MIT | 2026-10-24 |

## Tier 3 · Code libraries — use only where a feature needs it

Prefer small ones. Each adds bundle weight.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 119 | MapLibre GL JS (maplibre/maplibre-gl-js) | [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | MIT | 2026-11-05 |
| 121 | Leaflet (Leaflet/Leaflet) | [Leaflet/Leaflet](https://github.com/Leaflet/Leaflet) | BSD | 2026-11-06 |
| 132 | MiniSearch (lucaong/minisearch) | [lucaong/minisearch](https://github.com/lucaong/minisearch) | MIT | 2025-09-16 |
| 133 | FlexSearch (nextapps-de/flexsearch) | [nextapps-de/flexsearch](https://github.com/nextapps-de/flexsearch) | Apache-2.0 | 2026-05-29 |
| 134 | Fuse.js (krisk/fuse) | [krisk/fuse](https://github.com/krisk/fuse) | Apache-2.0 | 2026-08-08 |
| 113 | Graphology (graphology/graphology) | [graphology/graphology](https://github.com/graphology/graphology) | MIT | 2026-11-05 |
| 128 | OpenSeadragon (openseadragon/openseadragon) | [openseadragon/openseadragon](https://github.com/openseadragon/openseadragon) | BSD | 2026-10-29 |
| 127 | Mirador IIIF Viewer (ProjectMirador/mirador) | [projectmirador/mirador](https://github.com/projectmirador/mirador) | Apache-2.0 | 2026-10-30 |
| 135 | sql.js (sql-js/sql.js) | [sql-js/sql.js](https://github.com/sql-js/sql.js) | MIT | 2026-10-26 |
| 137 | DuckDB-Wasm (duckdb/duckdb-wasm) | [duckdb/duckdb-wasm](https://github.com/duckdb/duckdb-wasm) | MIT | 2026-11-03 |
| 136 | PGlite (electric-sql/pglite) | [electric-sql/pglite](https://github.com/electric-sql/pglite) | Apache-2.0 | 2026-11-03 |
| 108 | Three.js (mrdoob/three.js) | [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT | 2026-11-06 |
| 115 | D3.js (d3/d3) | [d3/d3](https://github.com/d3/d3) | ISC | 2026-11-03 |
| 123 | Bible Reference Formatter (openbibleinfo/Bible-Reference-Formatter) | [openbibleinfo/Bible-Reference-Formatter](https://github.com/openbibleinfo/Bible-Reference-Formatter) | no licence file | 2023-01-21 |
| 079 | Annotation Text-Fabric Framework & API (annotation/text-fabric) | [annotation/text-fabric](https://github.com/annotation/text-fabric) | MIT | 2026-11-06 |

## Tier 4 · Non-commercial licence — avoid

Blocks any future paid tier, ads or donations-funded store app. Use only with written permission.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 078 | ETCBC Biblia Hebraica Stuttgartensia Amstelodamensis (ETCBC/bhsa) | [ETCBC/bhsa](https://github.com/ETCBC/bhsa) | CC BY-NC 4.0 (data; code MIT) | 2026-01-18 |
| 081 | Open Hebrew Bible Project (eliranwong/OpenHebrewBible) | [eliranwong/OpenHebrewBible](https://github.com/eliranwong/OpenHebrewBible) | CC BY-NC 4.0 | 2023-05-31 |
| 082 | Rahlfs' 1935 Septuagint Database (eliranwong/LXX-Rahlfs-1935) | [eliranwong/LXX-Rahlfs-1935](https://github.com/eliranwong/LXX-Rahlfs-1935) | CC BY-NC-SA | 2020-01-25 |
| 098 | PROIEL Dependency Treebank (proiel/proiel-treebank) | [proiel/proiel-treebank](https://github.com/proiel/proiel-treebank) | CC BY-NC-SA | 2023-05-02 |
| 018 | BibleNLP/ebible | [BibleNLP/ebible](https://github.com/BibleNLP/ebible) | mixed, mostly CC BY-NC-ND | 2025-05-09 |
| 019 | bible-nlp/biblenlp-corpus (Hugging Face Parallel Dataset) | [link](https://huggingface.co/datasets/bible-nlp/biblenlp-corpus) | mixed, mostly NC/ND |  |
| 073 | Manar al-Athar Open-Access Photo Archive (University of Oxford) | [link](https://www.manar-al-athar.ox.ac.uk/en/information.html) | non-commercial |  |

## Tier 5 · Copyleft code (GPL) — do not ship this code in the app

Data inside may still be usable via the build pipeline if separately licensed.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 006 | josephilipraja/bible-cross-reference-json | [josephilipraja/bible-cross-reference-json](https://github.com/josephilipraja/bible-cross-reference-json) | GPL-2 | 2014-01-21 |
| 013 | rcdilorenzo/ecce | [rcdilorenzo/ecce](https://github.com/rcdilorenzo/ecce) | GPL-3 | 2019-12-19 |
| 020 | godlytalias/Bible-Database (Including Telugu JSON & SQLite) | [godlytalias/Bible-Database](https://github.com/godlytalias/Bible-Database) | GPL-3.0 | 2024-10-31 |
| 023 | aicwebtech/biblesupersearch_api | [aicwebtech/biblesupersearch_api](https://github.com/aicwebtech/biblesupersearch_api) | GPL-3 | 2026-11-05 |
| 106 | Bolls.life Bible API (Bolls-Bible/bain) | [Bolls-Bible/bain](https://github.com/Bolls-Bible/bain) | GPL-3 | 2026-10-21 |
| 130 | swordjs (zefanja/swordjs) | [zefanja/swordjs](https://github.com/zefanja/swordjs) | GPL-3.0 | 2016-05-12 |

## Tier 6 · No licence file — do not copy

No licence means all rights reserved. Public-domain content (Strong's, Tischendorf, Abbott-Smith 1922) should be taken from a licensed source instead.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 022 | sajeevavahini/bibles | [sajeevavahini/bibles](https://github.com/sajeevavahini/bibles) | no licence file | 2024-03-11 |
| 063 | BritishMuseumDH/apiResearch (British Museum Digital Humanities & 3D Data) | [BritishMuseumDH/apiResearch](https://github.com/BritishMuseumDH/apiResearch) | no licence file | 2016-06-29 |
| 083 | CATSS Septuagint Text-Fabric Conversion (codykingham/catss_lxx) | [codykingham/catss_lxx](https://github.com/codykingham/catss_lxx) | no licence file | 2017-12-17 |
| 097 | Biblical Humanities Greek New Testament & Lowfat Syntax Trees (biblicalhumanities/greek-new-testament) | [biblicalhumanities/greek-new-testament](https://github.com/biblicalhumanities/greek-new-testament) | no licence file | 2024-09-22 |
| 099 | OpenScriptures Strong's Hebrew & Greek Dictionaries (openscriptures/strongs) | [openscriptures/strongs](https://github.com/openscriptures/strongs) | none (content public domain) | 2021-07-15 |
| 087 | Tischendorf 8th Edition Greek NT with Morphology (morphgnt/tischendorf-data) | [morphgnt/tischendorf-data](https://github.com/morphgnt/tischendorf-data) | none (text public domain) | 2019-02-05 |
| 102 | Abbott-Smith Manual Greek Lexicon of the NT (translatable-exegetical-tools/Abbott- Smith) | [translatable-exegetical-tools/Abbott-Smith](https://github.com/translatable-exegetical-tools/Abbott-Smith) | none (1922 text public domain) | 2024-06-30 |
| 007 | gusheng/MetaV (KJV Bible Database with TSK & Metadata) | [gusheng/MetaV](https://github.com/gusheng/MetaV) | CC BY-SA 3.0 | 2013-07-06 |
| 005 | ringmast4r/The-Holy-Bible | [ringmast4r/The-Holy-Bible](https://github.com/ringmast4r/The-Holy-Bible) | MIT | 2026-09-16 |
| 024 | wldeh/bible-api | [wldeh/bible-api](https://github.com/wldeh/bible-api) | per-translation | 2024-06-16 |
| 090 | Open Greek New Testament Project (eliranwong/OpenGNT) | [eliranwong/OpenGNT](https://github.com/eliranwong/OpenGNT) | CC BY-SA 4.0 (README) | 2022-04-21 |
| 104 | BridgeConn Vachan Engine (Bridgeconn/vachan-engine) | [Bridgeconn/vachan-engine](https://github.com/Bridgeconn/vachan-engine) | MIT | 2019-01-24 |
| 012 | Bridgeconn/vachan-graph | [Bridgeconn/vachan-graph](https://github.com/Bridgeconn/vachan-graph) | MIT | 2021-10-26 |
| 021 | aruljohn/Bible-telugu | [aruljohn/Bible-telugu](https://github.com/aruljohn/Bible-telugu) | MIT | 2021-08-10 |

## Tier 7 · Link only (copyrighted images or restricted data)

Show as an outbound 'View at source' link on evidence items. Never copy images.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 050 | Leon Levy Dead Sea Scrolls Digital Library (Israel Antiquities Authority) | [link](https://www.deadseascrolls.org.il/explore-the-archive?locale=en_US) | copyright IAA |  |
| 051 | Digital Dead Sea Scrolls (The Israel Museum, Jerusalem) | [link](http://dss.collections.imj.org.il/project) | copyright |  |
| 057 | Packard Humanities Institute (PHI) Greek Inscriptions | [link](https://inscriptions.packhum.org/allregions) | copyright |  |
| 058 | Trismegistos (TM Ancient World Texts & Papyri Portal) | [link](https://www.trismegistos.org/tm/) | restricted |  |
| 038 | Trismegistos Places (TM Places Geo Database) | [link](https://www.trismegistos.org/geo/about.php) | restricted |  |
| 060 | Center for the Study of New Testament Manuscripts (CSNTM) | [link](https://manuscripts.csntm.org/) | copyright images |  |
| 061 | INTF New Testament Virtual Manuscript Room (NTVMR) | [link](https://ntvmr.uni-muenster.de/about) | restricted |  |
| 062 | Codex Sinaiticus Project | [link](https://codexsinaiticus.org/en/codex/) | copyright images |  |
| 064 | Musée du Louvre Collections Database & JSON API | [link](https://collections.louvre.fr/en/page/documentationJSON) | Louvre terms |  |
| 029 | Bible Mapper Atlas | [link](https://biblemapper.com/) | proprietary |  |
| 041 | ORBIS: The Stanford Geospatial Network Model of the Roman World Portal | [link](https://orbis.stanford.edu/) | site only |  |
| 045 | Mapping Past Societies (MAPS) / DARMC (Harvard University) | [link](https://darmc.harvard.edu/data-availability) | per layer |  |
| 048 | MEGA-Jordan (Middle Eastern Geodatabase for Antiquities) | [link](http://www.megajordan.org/) | restricted |  |
| 066 | Harvard Museum of the Ancient Near East (HMANE) Collections | [link](https://hmane.harvard.edu/collections) | site only |  |
| 069 | The Digital Archaeological Record (tDAR via DataONE) | [link](https://search.dataone.org/portals/TDAR) | restricted |  |
| 070 | Archaeology Data Service (ADS at University of York) | [link](https://archaeologydataservice.ac.uk/data-catalogue/) | per archive |  |
| 071 | The Levantine Ceramics Project (LCP / ASOR) | [link](https://www.levantineceramics.org/about) | site only |  |
| 072 | EAMENA Database (Endangered Archaeology in the Middle East & North Africa) | [link](https://eamena.org/database) | restricted |  |
| 074 | Israel Antiquities Authority (IAA) Archaeological Survey of Israel | [link](https://survey.iaa.org.il/index_) | site only |  |
| 075 | The Digital Archaeological Atlas of the Holy Land (DAAHL at UC San Diego) | [link](https://gaialab.terrawatchers.org/DAAHL/) | verify |  |
| 076 | OCHRE Data Service (University of Chicago Oriental Institute) | [link](https://voices.uchicago.edu/ochre/database/) | per project |  |
| 107 | API.Bible Developer Platform (docs.api.bible) | [link](https://docs.api.bible/api-reference/getting-started/) | API key + terms |  |
| 002 | Chris Harrison & Christoph Römhild's BibleViz Cross-Reference & Social Network Dataset | [link](https://www.chrisharrison.net/index.php/visualizations/) | none stated (visual art) |  |
| 055 | Cuneiform Digital Library Initiative (CDLI) | [link](https://cdli.earth/browse) | verify per item |  |
| 056 | Inscriptions of Israel/Palestine (IIP at Brown University) | [link](https://cds.lib.brown.edu/cds-project/inscriptions-israelpalestine) | verify |  |
| 035 | ToposText Ancient Places Dataset | [link](https://topostext.org/TT-downloads) | verify |  |

## Tier 8 · Not needed now (overkill or out of scope)

Revisit only with a concrete feature.

| # | Resource | Source | Licence | Last update |
|---|---|---|---|---|
| 120 | CesiumJS (CesiumGS/cesium) | [cesiumgs/cesium](https://github.com/cesiumgs/cesium) | Apache-2.0 | 2026-11-05 |
| 118 | Deck.gl (visgl/deck.gl) | [visgl/deck.gl](https://github.com/visgl/deck.gl) | MIT | 2026-11-05 |
| 117 | AntV G6 (antvis/g6) | [antvis/g6](https://github.com/antvis/g6) | MIT | 2026-10-22 |
| 111 | Cosmograph / Cosmos.gl (cosmosgl/graph) | [cosmosgl/graph](https://github.com/cosmosgl/graph) | MIT | 2026-11-04 |
| 116 | VivaGraphJS (anvaka/VivaGraphJS) | [anvaka/VivaGraphJS](https://github.com/anvaka/VivaGraphJS) | BSD | 2026-03-05 |
| 110 | three-globe (vasturiano/three-globe) | [vasturiano/three-globe](https://github.com/vasturiano/three-globe) | MIT | 2026-10-14 |
| 109 | 3d-force-graph (vasturiano/3d-force-graph) | [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph) | MIT | 2026-11-05 |
| 112 | Sigma.js (jacomyal/sigma.js) | [jacomyal/sigma.js](https://github.com/jacomyal/sigma.js) | MIT | 2026-11-05 |
| 114 | Cytoscape.js (cytoscape/cytoscape.js) | [cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js) | MIT | 2026-11-05 |
| 126 | Scaife Viewer (scaife-viewer/scaife-viewer) | [scaife-viewer/scaife-viewer](https://github.com/scaife-viewer/scaife-viewer) | MIT | 2026-08-10 |
| 125 | Alpheios Embedded Library (alpheios-project/embed-lib) | [alpheios-project/embed-lib](https://github.com/alpheios-project/embed-lib) | verify | 2021-06-25 |
| 131 | STEPBible Platform & BibleEngine (STEPBible/step) | [STEPBible/step](https://github.com/STEPBible/step) | BSD | 2026-11-03 |
| 040 | emeeks/orbis_stanford (ORBIS Geospatial Network Model Code & Data) | [emeeks/orbis_stanford](https://github.com/emeeks/orbis_stanford) | MIT | 2012-06-15 |
| 034 | WorldHistoricalGazetteer/whg3 (Platform Source & Linked Places Specs) | [WorldHistoricalGazetteer/whg3](https://github.com/WorldHistoricalGazetteer/whg3) | BSD | 2026-11-04 |
| 037 | britishlibrary/peripleo | [britishlibrary/peripleo](https://github.com/britishlibrary/peripleo) | MIT | 2026-05-05 |
| 052 | Scripta Qumranica Electronica REST API (SQE_API) | [Scripta-Qumranica-Electronica/SQE_API](https://github.com/Scripta-Qumranica-Electronica/SQE_API) | MIT | 2026-07-21 |
| 053 | Scripta Qumranica Electronica Database Schema (SQE_Database) | [Scripta-Qumranica-Electronica/SQE_Database](https://github.com/Scripta-Qumranica-Electronica/SQE_Database) | MIT | 2026-07-25 |
| 054 | Open Richly Annotated Cuneiform Corpus (ORACC) | [link](https://oracc.museum.upenn.edu/projectlist.html) | mostly CC BY-SA |  |
| 124 | python-scriptures (davisd/python-scriptures) | [davisd/python-scriptures](https://github.com/davisd/python-scriptures) | BSD | 2016-12-29 |
| 084 | Sefaria Open Library & Aramaic Export (Sefaria/Sefaria-Export) | [Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) | CC0 | 2026-11-02 |
| 092 | OpenGreekAndLatin First Thousand Years of Greek (opengreekandlatin/First1KGreek) | [opengreekandlatin/First1KGreek](https://github.com/opengreekandlatin/First1KGreek) | CC BY-SA | 2026-10-27 |
| 093 | Perseus Digital Library Canonical Greek Literature (PerseusDL/canonical-greekLit) | [PerseusDL/canonical-greekLit](https://github.com/PerseusDL/canonical-greekLit) | CC BY-SA | 2026-11-02 |
| 088 | Byzantine Majority Text with Robinson Morphology (byztxt/byzantine-majority-text) | [byztxt/byzantine-majority-text](https://github.com/byztxt/byzantine-majority-text) | Unlicense | 2024-12-31 |
| 089 | Robinson's Textus Receptus Greek NT (byztxt/greektext-textus-receptus) | [byztxt/greektext-textus-receptus](https://github.com/byztxt/greektext-textus-receptus) | Public domain | 2017-05-23 |
| 086 | MorphGNT SBLGNT Morphological Database (morphgnt/sblgnt) | [morphgnt/sblgnt](https://github.com/morphgnt/sblgnt) | CC BY-SA 3.0 + SBLGNT EULA | 2024-01-21 |
| 091 | Center for New Testament Restoration (greekcntr.org) | [link](https://greekcntr.org/) | CC BY-SA 4.0 (verify) |  |
| 100 | OpenScriptures BDB Hebrew Lexicon (openscriptures/HebrewLexicon) | [openscriptures/HebrewLexicon](https://github.com/openscriptures/HebrewLexicon) | Public domain | 2019-09-02 |
| 101 | unfoldingWord Enhanced Brown-Driver-Briggs Lexicon (unfoldingWord/Brown-Driver- Briggs-Enhanced) | [unfoldingWord/Brown-Driver-Briggs-Enhanced](https://github.com/unfoldingWord/Brown-Driver-Briggs-Enhanced) | CC BY | 2023-05-02 |
| 016 | ETCBC/parallels | [ETCBC/parallels](https://github.com/ETCBC/parallels) | MIT | 2023-11-13 |
| 017 | NuBerea/macula-sblgnt-syntax (Hugging Face NLP Dataset) | [link](https://huggingface.co/datasets/Nu) | verify on Hugging Face |  |
| 028 | EarthViewer/bible-atlas | [EarthViewer/bible-atlas](https://github.com/EarthViewer/bible-atlas) | MIT | 2018-08-26 |
| 030 | Internet Sacred Text Archive: Bible Maps (1888) | [link](https://sacred-texts.com/book/bible-maps) | public-domain scans |  |
| 033 | World Historical Gazetteer (WHG) API & Schema | [link](https://whgazetteer.org/api/schema/swagger-ui/) | per dataset |  |
| 036 | Pelagios Network – Recogito Geo-Annotation Platform | [link](https://recogito.pelagios.org/) | tool |  |
| 039 | Vici.org – Archaeological Atlas of Antiquity | [link](https://vici.org/?lang=en) | CC BY-SA |  |
| 042 | Itiner-e: High-Resolution Dataset of Roads of the Roman Empire | [link](https://pmc.ncbi.nlm.nih.gov/articles/PMC12592351/) | verify (paper) |  |
| 044 | Digital Atlas of the Roman Empire (DARE) | [link](https://imperium.ahlfeldt.se/) | CC BY-SA |  |
| 046 | The Syriac Gazetteer (Syriaca.org) | [link](https://syriaca.org/geo) | CC BY |  |
| 047 | DigitalPasts/MAPA (Mesopotamian Ancient Place-Names Almanac) | [DigitalPasts/MAPA](https://github.com/DigitalPasts/MAPA) | CC BY-SA | 2022-04-05 |
| 067 | Portable Antiquities Scheme (PAS) GitHub & Database | [findsorguk/findsorguk](https://github.com/findsorguk/findsorguk) | LGPL | 2026-08-05 |
| 105 | AO Lab Free Use Bible API & Offline SQLite Dump (bible.helloao.org) | [link](https://bible.helloao.org/docs/) | free API; per-translation |  |
| 129 | The SWORD Project Engine (crosswire.org/sword) | [link](https://crosswire.org/sword/) | per module |  |
| 008 | donjmilligan/flare-bible-study | [donjmilligan/flare-bible-study](https://github.com/donjmilligan/flare-bible-study) | MIT | 2025-08-07 |
| 004 | trekhleb/bible-cross-references | [trekhleb/bible-cross-references](https://github.com/trekhleb/bible-cross-references) | MIT | 2026-11-01 |
