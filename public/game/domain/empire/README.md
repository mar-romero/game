# Empire domain

Pure persistent-economy rules and data for the Megafactory. `catalog.js` owns civilizations, buildings, research definitions/paths, and pure research-lock helpers. `economy.js` calculates production multipliers and rates from an Empire state object. `progression.js` calculates score, prestige progress, building and research costs, civilization mastery, and contracts. These modules do not read `localStorage` or update the page; the Empire controller calls them through temporary browser namespaces.
