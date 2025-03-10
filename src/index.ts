import { IMod } from "vortex-api/lib/extensions/mod_management/types/IMod";
import { IState } from "vortex-api/lib/types/IState";
import { IExtensionContext } from "vortex-api/lib/types/IExtensionContext";
import getSafe from "./getSafe";
import { htmlTransformer, textTransformer } from "./transformers";

const path = require("path");
const fs = require("fs");

// This is the data structure that I want our file to have
export interface Mod {
  name?: string;
  game: string;
  modId: number;
  fileId: number;
  source?: string;
  enabled?: boolean;
  vortexId?: string;
  homepage?: string;
  version?: string;
}

interface Profile {
  gameId: string;
  id: string;
  lastActivated: number;
  modState?: Record<string, { enabled: boolean }>;
}

// Get the active profile from the redux state.
const activeProfile = (state: IState): Profile => {
  const profileId = state.settings.profiles.activeProfileId;
  return getSafe(state, ["persistent", "profiles", profileId], undefined);
};

// Fetch the current active Game ID
const getActiveGameId = (state: IState): string => {
  const profile = activeProfile(state);
  return profile !== undefined ? profile.gameId : undefined;
};

// Transform the format of the mod from what's used internally in Vortex into what we want to store in the file
const transformModFormat = (mod: IMod, activeProfile: Profile): Mod => ({
  name: mod.attributes.modName ?? mod.attributes.logicalFileName,
  version: mod.attributes.modVersion,
  homepage: mod.attributes.homepage,
  game: mod.attributes.downloadGame,
  modId: mod.attributes.modId,
  fileId: mod.attributes.fileId,
  source: mod.attributes.source,
  enabled:
    !!activeProfile.modState &&
    activeProfile.modState[mod.id]?.enabled === true,
  vortexId: mod.id,
});

/*
 * The installed mods will come back in an object format for games, where as we want an array, so do the following:
 *    Get the values of those objects
 *    Transform them into the structure we want
 *    We now have data in structure Mod[][], so let's concat all the array's into one array
 */
const getInstalledMods = (state: IState): Mod[] => {
  const profile = activeProfile(state);

  return Object.values(state.persistent.mods)
    .map((game) =>
      Object.values(game).map((mod) => transformModFormat(mod, profile))
    )
    .reduce((result, current) => result.concat(current), []);
};

const init = (context: IExtensionContext) => {
  const { api } = context;

  const saveList = (
    transformer: (mods: Mod[]) => string,
    extension: string,
    thisGameOnly: boolean = false,
    thisProfileOnly: boolean = false
  ) => {
    return () => {
      const state = api.store.getState();
      let mods = getInstalledMods(state);

      // Ask the user where they want to export to
      api
        .selectFile({
          create: true,
          title: "Select file to export to",
          filters: [{ name: "*", extensions: [extension] }],
        })
        .then((fileName) => {
          const activeGameId = getActiveGameId(state);

          mods = mods
            // Some mods don't have modId's or fileId's. Maybe they were manually installed? Since we need a modId
            // and a fileId, there's no point int writing out mods that have neither
            .filter((mod) => mod.modId && mod.fileId && mod.game);

          // If we're only backing up the existing games, let's filter out other ones
          if (thisGameOnly) {
            mods = mods.filter((mod) => mod.game === activeGameId);
          }

          if (thisProfileOnly) {
            mods = mods.filter((mod) => mod.enabled);
          }

          // Write the file in pretty-print JSON for user readability
          fs.writeFile(path.resolve(fileName), transformer(mods), (error) => {
            if (error) {
              api.showErrorNotification(error, error);
              return;
            }

            api.sendNotification({
              type: "success",
              title: "File saved",
              message: `Modlist saved to ${path.resolve(fileName)}`,
            });
          });
        })
        .catch((error) => console.log(error));
    };
  };

  // Register our option to backup mods. We use `999` as our position to put this at the end of the menu list.
  // Because we have the same position as the Modlist Backup: Restore option, they'll group together as a dropdown option
  context.registerAction(
    "mod-icons",
    998,
    "clipboard",
    {},
    "Save this profile as text file",
    saveList(textTransformer, "txt", true, true)
  );

  context.registerAction(
    "mod-icons",
    998,
    "clipboard",
    {},
    "Save this profile an HTML file",
    saveList(htmlTransformer, "html", true, true)
  );
};

module.exports = { default: init };
